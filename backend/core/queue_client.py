import os
import json
import logging
import time
from typing import Dict, Any, Optional, Callable

log = logging.getLogger("queue_client")
if not log.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [QUEUE] %(message)s", datefmt="%H:%M:%S")
    ch.setFormatter(formatter)
    log.addHandler(ch)
    log.setLevel(logging.INFO)

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "elevate_mq")
RABBITMQ_PASS = os.getenv("RABBITMQ_PASS", "superfood_rabbit_pass_2026")
QUEUE_NAME = "ofd_ingest_queue"
DLX_QUEUE_NAME = "ofd_dead_letter_queue"


def get_rabbitmq_connection(max_retries: int = 3, retry_delay: float = 1.5):
    """
    Establishes connection to RabbitMQ with automatic retries.
    """
    try:
        import pika
    except ImportError:
        log.warning("Pika library is not installed. RabbitMQ operations disabled.")
        return None

    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
        connection_attempts=max_retries,
        retry_delay=int(retry_delay)
    )

    for attempt in range(1, max_retries + 1):
        try:
            conn = pika.BlockingConnection(parameters)
            return conn
        except Exception as e:
            log.warning(f"Connection attempt {attempt}/{max_retries} to RabbitMQ failed: {e}")
            if attempt < max_retries:
                time.sleep(retry_delay)
    return None


def setup_queue_topology(channel):
    """
    Declares main durable queue with Dead Letter Exchange (DLX) fallback.
    """
    import pika

    # Declare Dead Letter Exchange & Queue
    channel.exchange_declare(exchange="ofd_dlx", exchange_type="direct", durable=True)
    channel.queue_declare(queue=DLX_QUEUE_NAME, durable=True)
    channel.queue_bind(exchange="ofd_dlx", queue=DLX_QUEUE_NAME, routing_key="dlx_routing_key")

    # Declare Main Queue linked to DLX
    args = {
        "x-dead-letter-exchange": "ofd_dlx",
        "x-dead-letter-routing-key": "dlx_routing_key"
    }
    channel.queue_declare(queue=QUEUE_NAME, durable=True, arguments=args)


def publish_ingest_event(event_data: Dict[str, Any]) -> bool:
    """
    Publishes an ingestion event payload to RabbitMQ.
    Returns True if successfully queued, False otherwise.
    """
    conn = get_rabbitmq_connection()
    if not conn:
        log.error("Unable to connect to RabbitMQ broker. Event cannot be published directly.")
        return False

    try:
        import pika
        channel = conn.channel()
        setup_queue_topology(channel)

        message_body = json.dumps(event_data, ensure_ascii=False)
        channel.basic_publish(
            exchange="",
            routing_key=QUEUE_NAME,
            body=message_body.encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent on disk
                content_type="application/json",
                message_id=str(event_data.get("idempotency_key", "")),
                timestamp=int(time.time())
            )
        )
        conn.close()
        log.info(f"Successfully published event for store '{event_data.get('store_id')}' to queue.")
        return True
    except Exception as e:
        log.error(f"Failed to publish message to RabbitMQ: {e}")
        try:
            conn.close()
        except Exception:
            pass
        return False


def start_event_consumer(callback_fn: Callable[[Dict[str, Any]], bool], prefetch_count: int = 1):
    """
    Starts blocking consumer loop for processing OFD events.
    """
    while True:
        conn = get_rabbitmq_connection(max_retries=5, retry_delay=3.0)
        if not conn:
            log.error("RabbitMQ broker unavailable. Retrying consumer connection in 5 seconds...")
            time.sleep(5)
            continue

        try:
            channel = conn.channel()
            setup_queue_topology(channel)
            channel.basic_qos(prefetch_count=prefetch_count)

            def _on_message(ch, method, properties, body):
                try:
                    payload = json.loads(body.decode("utf-8"))
                    log.info(f"Received message: {payload.get('platform')} - {payload.get('store_id')}")
                    success = callback_fn(payload)
                    if success:
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                    else:
                        # Reject message and move to DLX
                        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
                except Exception as ex:
                    log.error(f"Error handling consumer message: {ex}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=QUEUE_NAME, on_message_callback=_on_message)
            log.info(f"ETL Worker consumer started listening on queue '{QUEUE_NAME}'...")
            channel.start_consuming()

        except Exception as e:
            log.warning(f"Consumer connection interrupted: {e}. Reconnecting in 3 seconds...")
            time.sleep(3)

import random
from datetime import datetime
import string


def mask_with_timestamp(id, full_date=False):
    return id + "_" + time_timestamp(full_date)


def random_id_with_timestamp(full_date=False):
    characters = string.ascii_letters + string.digits
    length = 8
    return ''.join(random.choices(characters, k=length)) + "_" + time_timestamp(full_date)


def time_timestamp(full_date=False):
    now = datetime.now()
    ms = now.microsecond // 1000
    hour = now.hour  # Avoid %-H to keep compatibility

    if full_date:
        return f"{now:%d-%m}--{hour}h{now:%M}m{now:%S}s{ms:03d}ms"
    return f"{hour}h{now:%M}m{now:%S}s{ms:03d}ms"

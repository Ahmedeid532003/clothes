import threading

_thread = threading.local()


def set_current_tenant(tenant):
    _thread.tenant = tenant


def get_current_tenant():
    return getattr(_thread, "tenant", None)


def clear_current_tenant():
    if hasattr(_thread, "tenant"):
        del _thread.tenant

import os

__version__ = "1.1.0"

_ROOT = os.path.abspath(os.path.dirname(__file__))


def get_templates():
    return os.path.join(_ROOT, "templates")

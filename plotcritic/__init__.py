import os
__version__ = "1.0.1"

_ROOT = os.path.abspath(os.path.dirname(__file__))
def get_templates():
    return os.path.join(_ROOT, 'templates')

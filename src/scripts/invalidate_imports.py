import importlib
import sys

STDLIB_PREFIX = "/lib/python314.zip/"
WHEEL_PREFIX = "/lib/python3.14/"


def is_user(mod):
    file = getattr(mod, "__file__", "")

    return (
        file
        and not file.startswith(STDLIB_PREFIX)
        and not file.startswith(WHEEL_PREFIX)
    )


user_mods = [mod for mod in sys.modules if is_user(sys.modules[mod])]

for mod in user_mods:
    del sys.modules[mod]

importlib.invalidate_caches()

pygame_loaded = any("pygame" in mod for mod in sys.modules)

if pygame_loaded:
    import pygame

    if pygame.get_init():
        pygame.quit()

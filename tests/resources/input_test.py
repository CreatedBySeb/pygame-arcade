import asyncio

import pygame

CANVAS_SIZE: tuple[int, int] = (640, 480)
FRAME_DELAY: float = 1.0 / 60.0


async def main() -> None:
    pygame.init()
    pygame.display.set_mode(CANVAS_SIZE)
    print("Ready!")

    while True:
        events = pygame.event.get()

        for event in events:
            if event.type == pygame.KEYDOWN:
                print(f"Key Pressed: {event.unicode}")
            elif event.type == pygame.KEYUP:
                print(f"Key Released: {event.unicode}")
            elif event.type == pygame.MOUSEBUTTONDOWN:
                print(f"Mouse Pressed: {event.button} {event.pos}")
            elif event.type == pygame.MOUSEBUTTONUP:
                print(f"Mouse Released: {event.button} {event.pos}")

        pygame.display.flip()
        await asyncio.sleep(FRAME_DELAY)

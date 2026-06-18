import { ref, type Ref } from "vue";

const DEFAULT_PROGRAM = `\
import asyncio

import pygame


BACKGROUND_COLOUR: pygame.Color = pygame.Color("black")
CANVAS_SIZE: tuple[int, int] = (640, 480)
FRAME_DELAY: float = 1.0 / 60.0


# Define the main function for your game
async def main() -> None:
    # Set up pygame with the canvas size
    pygame.init()
    screen = pygame.display.set_mode(CANVAS_SIZE)

    running = True

    # Run indefinitely until we give a signal to stop
    while running:
        # Fetch any new events, like input
        events = pygame.event.get()

        # If any event tells us to quit, provide the stop signal
        if any(event.type == pygame.QUIT for event in events):
            running = False

        # Start by clearing the screen using the background colour
        screen.fill(BACKGROUND_COLOUR)

        # TODO: Draw your game!

        # Present the newly drawn frame
        pygame.display.flip()

        # Wait for a small amount of time to allow the browser to process
        await asyncio.sleep(FRAME_DELAY)


# Run it!
main()
`;

const programRef = ref(DEFAULT_PROGRAM);

export function useProgram(): Ref<string> {
  return programRef;
}

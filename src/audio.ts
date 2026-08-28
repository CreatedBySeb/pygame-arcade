/// <reference types="@types/audioworklet" />

/**
 * Simple processor which just proxies buffers to the worker thread
 */
class ProxyProcessor
  extends AudioWorkletProcessor
  implements AudioWorkletProcessorImpl
{
  protected audioBuffers: Float32Array[] = [];
  protected bufferSize: number = 0;
  protected firstRun: boolean = true;
  protected readOffset: number = 0;
  protected ready: boolean = false;
  protected sharedBuffers: Float32Array[] = [];
  protected signalBuffer: Int32Array = new Int32Array(2);

  constructor() {
    super();

    this.port.onmessage = (event) => {
      const { audioBuffers, signalBuffer } = event.data as {
        audioBuffers: Float32Array[];
        signalBuffer: Int32Array;
      };

      const bufSizes = audioBuffers.map((buf) => buf.length);
      if (new Set(bufSizes).size > 1) {
        console.error(
          "ProxyProcessor got shared buffers of different sizes, audio will not play",
        );
        return;
      }

      if (!audioBuffers.every((buf) => buf instanceof Float32Array)) {
        console.error(
          "ProxyProcessor got shared buffers which were not Float32Array, audio will not play",
        );
        return;
      }

      if (!(signalBuffer instanceof Int32Array)) {
        console.error(
          "ProxyProcessor got signal buffer which was not Int32Array, audio will not play",
        );
        return;
      }

      // Save the buffers and shared buffer size
      this.bufferSize = bufSizes[0];
      this.sharedBuffers = audioBuffers;
      this.signalBuffer = signalBuffer;

      // Initialise copies to be all 0
      this.audioBuffers = audioBuffers.map(
        (buf) => new Float32Array(buf.length),
      );

      console.debug(
        `ProxyProcessor set up with buffers (size: ${this.bufferSize})`,
      );

      this.ready = true;
    };
  }

  public process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    if (!this.ready) {
      return true;
    }

    if (this.firstRun) {
      // Always signal for new audio on first run
      this.firstRun = false;
      Atomics.notify(this.signalBuffer, 0);
    }

    if (this.readOffset === 0) {
      // Only request data from worker when we are starting a cycle
      Atomics.wait(this.signalBuffer, 1, 0, 0.5); // FIXME: find the correct timeout, probably shorter than this?

      // Copy the data out of the shared buffers
      this.sharedBuffers.forEach((buf, i) => {
        for (let index = 0; index < buf.length; index++) {
          this.audioBuffers[i][index] = buf[index];
        }
      });
    }

    // FIXME: This assumes each output array only has one value, unsure if this
    // is guaranteed
    outputs.forEach(([output], i) => {
      const input = this.audioBuffers[i];

      for (let index = 0; index < output.length; index++) {
        output[index] = input[index + this.readOffset];
      }
    });

    // FIXME: Assuming each output has the same length
    const sampleLength = outputs[0][0].length;
    this.readOffset += sampleLength;

    // FIXME: how to handle if they don't divide evenly? is that realistic with powers of 2?
    if (this.readOffset >= this.bufferSize) {
      // Reset offset we've used the full buffer
      this.readOffset = 0;
    } else if (this.readOffset >= this.bufferSize - 2 * sampleLength) {
      // Signal for new audio 2 samples before we run out
      Atomics.notify(this.signalBuffer, 0);
    }

    return true;
  }
}

registerProcessor("proxy-processor", ProxyProcessor);

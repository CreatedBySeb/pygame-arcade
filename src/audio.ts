/// <reference types="@types/audioworklet" />

/**
 * Simple processor which just proxies buffers to the worker thread
 */
class ProxyProcessor
  extends AudioWorkletProcessor
  implements AudioWorkletProcessorImpl
{
  protected dataBuffers: Float32Array[] = [];
  protected readOffset: number = 0;
  protected ready: boolean = false;
  protected signalBuffer: Int32Array = new Int32Array(2);

  constructor() {
    super();

    this.port.onmessage = (event) => {
      // FIXME: Assuming we get a good payload
      this.dataBuffers = event.data.audioBuffers;
      this.signalBuffer = event.data.signalBuffer;
      this.ready = true;

      console.debug("AudioWorklet is set up with buffers");
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

    // TODO: Investigate pre-buffering; if we request the data 1-2 samples early, then only wait
    // when we need it, hopefully it may already be there and we can continue seamlessly?
    // Only request data from worker when we are starting a cycle
    if (this.readOffset === 0) {
      // console.debug("AudioWorklet notifying worker");
      Atomics.notify(this.signalBuffer, 0);
      Atomics.wait(this.signalBuffer, 1, 0, 0.5); // FIXME: find the correct timeout, probably shorter than this?
      // console.debug("AudioWorklet woken");
    }

    /* console.debug(
      `Output sizes: ` +
        outputs
          .map((bufs) => bufs.map((buf) => buf.length).join(","))
          .join(";"),
    ); */

    outputs.forEach(([output], i) => {
      const input = this.dataBuffers[i];

      for (let index = 0; index < output.length; index++) {
        output[index] = input[index + this.readOffset];
      }
    });

    this.readOffset += 128; // FIXME: don't hard code this

    // Reset once we've used the full buffer
    if (this.readOffset === 1024) {
      this.readOffset = 0;
    }

    return true;
  }
}

registerProcessor("proxy-processor", ProxyProcessor);

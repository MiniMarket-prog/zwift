declare module "quagga" {
    interface QuaggaJSResultObject {
      codeResult: {
        code: string
        format: string
      }
      line: any
      angle: number
      pattern: number[]
      box: number[][]
      boxes: number[][][]
    }
  
    interface QuaggaJSInitConfig {
      inputStream: {
        name?: string
        type?: string
        target?: HTMLElement | string
        constraints?: {
          width?: { min?: number }
          height?: { min?: number }
          aspectRatio?: { min?: number; max?: number }
          facingMode?: string
          deviceId?: string
        }
        area?: {
          top?: string | number
          right?: string | number
          left?: string | number
          bottom?: string | number
        }
        singleChannel?: boolean
      }
      locator?: {
        patchSize?: string
        halfSample?: boolean
      }
      numOfWorkers?: number
      frequency?: number
      decoder?: {
        readers?: string[]
        debug?: {
          drawBoundingBox?: boolean
          showFrequency?: boolean
          drawScanline?: boolean
          showPattern?: boolean
        }
        multiple?: boolean
      }
      locate?: boolean
    }
  
    interface QuaggaJSStatic {
      init(config: QuaggaJSInitConfig, callback?: (err: any) => void): Promise<void>
      start(): void
      stop(): void
      onDetected(callback: (result: QuaggaJSResultObject) => void): void
      offDetected(callback: (result: QuaggaJSResultObject) => void): void
      onProcessed(callback: (result: any) => void): void
      offProcessed(callback: (result: any) => void): void
    }
  
    const Quagga: QuaggaJSStatic
    export default Quagga
  }
  
  
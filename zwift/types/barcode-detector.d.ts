// Type definitions for the Barcode Detection API
// https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API

interface BarcodeDetectorOptions {
    formats?: string[]
  }
  
  interface BarcodeDetectorResult {
    boundingBox: DOMRectReadOnly
    cornerPoints: ReadonlyArray<{ x: number; y: number }>
    format: string
    rawValue: string
  }
  
  declare class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions)
    static getSupportedFormats(): Promise<string[]>
    detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>
  }
  
  interface Window {
    BarcodeDetector?: typeof BarcodeDetector
  }
  
  
export interface VectorImage {
    artifacts: Artifact[]
    rootUrl: string
  }
  
  export interface Artifact {
    fileIdentifyingUrlPathSegment: string
    width: number
    height: number
    expiresAt: number
    $recipeTypes?: string[]
    $type?: string
  }

  export interface LinkedVectorImage {
    'com.linkedin.common.VectorImage': VectorImage
  }
  
  export interface LinkedMediaProcessorImage {
    'com.linkedin.voyager.common.MediaProcessorImage': {
      id: string
    }
  }
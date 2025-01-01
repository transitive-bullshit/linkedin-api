export interface FullLocation {
    country: string
    geographicArea: string
    city: string
    postalCode: string
    line1: string
    headquarter?: boolean
    streetAddressOptOut?: boolean
  }

  export interface GeoLocation {
    geoUrn: string
  }
  
  export interface Location {
    basicLocation: BasicLocation
  }
  
  export interface BasicLocation {
    countryCode: string
  }


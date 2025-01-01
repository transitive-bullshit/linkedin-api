import { LinkedVectorImage } from "./image.type.js"

export interface Company {
    miniCompany: MiniCompany
    employeeCountRange: EmployeeCountRange
    industries: string[]
  }
  
  export interface MiniCompany {
    objectUrn: string
    entityUrn: string
    name: string
    showcase: boolean
    active: boolean
    logo: LinkedVectorImage
    universalName: string
    dashCompanyUrn: string
    trackingId: string
  }

  export interface EmployeeCountRange {
    start: number
    end?: number
  }
  
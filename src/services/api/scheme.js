// AGRI MITRA AI — Government Schemes API Proxy & Service Layer
import { governmentSchemesApi, calculateSchemeMatchScore } from './governmentSchemes';

export { calculateSchemeMatchScore };
export const schemeApi = governmentSchemesApi;
export default schemeApi;

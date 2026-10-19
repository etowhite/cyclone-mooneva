import { toLocalISOString } from '../../utils/dateUtils';
import { formatLocalTimeHHmm } from '../../utils/timeFormat';

/** Local 'YYYY-MM-DDTHH:mm', the format of LabEvent.at. */
export const localDateTime = (d: Date): string => `${toLocalISOString(d)}T${formatLocalTimeHHmm(d)}`;

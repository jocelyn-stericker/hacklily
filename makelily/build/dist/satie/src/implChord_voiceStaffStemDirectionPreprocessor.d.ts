import { IModel, IMeasure } from "./document";
export declare type StaffToVoicesType = {
    [staff: number]: {
        [voice: number]: IModel[];
    };
    [staff: string]: {
        [voice: number]: IModel[];
    };
};
export default voiceStaffStemDirection;
declare function voiceStaffStemDirection(measures: IMeasure[]): IMeasure[];

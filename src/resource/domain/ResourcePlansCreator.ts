import { ResourcePlan } from "./resource";

export interface ResourcePlansCreator {
    createResourcePlans(): Promise<ResourcePlan[]>
}

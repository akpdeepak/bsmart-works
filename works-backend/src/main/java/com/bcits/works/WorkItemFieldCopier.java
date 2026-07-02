package com.bcits.works;

/**
 * Pure field-mapping helper extracted from {@link WorkItemCommandService} (Phase 2 / W2 god-class
 * split). Copies the type-specific work-item attributes from an incoming update onto the managed
 * entity. It is a mechanical setter mapping with <b>no</b> tenant, RBAC, field-level-security, or
 * persistence logic — those all stay in {@link WorkItemCommandService}. Behaviour is unchanged; this
 * is a verbatim move (an eventual MapStruct mapper could replace it, RB-10 §5).
 */
final class WorkItemFieldCopier {

    private WorkItemFieldCopier() { }

    /** Copies the type-specific fields (bug / risk / incident / service-request / … attributes). */
    static void applyTypeSpecificUpdates(WorkItem existing, WorkItem updatedItem) {
        existing.setReporterId(updatedItem.getReporterId());
        existing.setSeverity(updatedItem.getSeverity());
        existing.setEnvironmentDetail(updatedItem.getEnvironmentDetail());
        existing.setBusinessImpact(updatedItem.getBusinessImpact());
        existing.setResponseSpeed(updatedItem.getResponseSpeed());
        existing.setRespondingTeam(updatedItem.getRespondingTeam());
        existing.setResolutionType(updatedItem.getResolutionType());
        existing.setRootCause(updatedItem.getRootCause());
        existing.setProbability(updatedItem.getProbability());
        existing.setImpactLevel(updatedItem.getImpactLevel());
        existing.setRiskScore(updatedItem.getRiskScore());
        existing.setDependencyType(updatedItem.getDependencyType());
        existing.setSourceItemId(updatedItem.getSourceItemId());
        existing.setTargetItemId(updatedItem.getTargetItemId());
        existing.setApproverId(updatedItem.getApproverId());
        existing.setRequestedForId(updatedItem.getRequestedForId());
        existing.setNeededByDate(updatedItem.getNeededByDate());
        existing.setItemCategory(updatedItem.getItemCategory());
        existing.setSubArea(updatedItem.getSubArea());
        existing.setDepartment(updatedItem.getDepartment());
        existing.setRegressionRisk(updatedItem.getRegressionRisk());
        existing.setStepsToReproduce(updatedItem.getStepsToReproduce());
        existing.setExpectedBehavior(updatedItem.getExpectedBehavior());
        existing.setActualBehavior(updatedItem.getActualBehavior());
        existing.setAffectedVersion(updatedItem.getAffectedVersion());
        existing.setFixedInVersion(updatedItem.getFixedInVersion());
        existing.setFixDescription(updatedItem.getFixDescription());
        existing.setMitigationPlan(updatedItem.getMitigationPlan());
        existing.setContingencyPlan(updatedItem.getContingencyPlan());
        existing.setBasisRationale(updatedItem.getBasisRationale());
        existing.setValidationDate(updatedItem.getValidationDate());
        existing.setRiskIfWrong(updatedItem.getRiskIfWrong());
        existing.setImpactIfDelayed(updatedItem.getImpactIfDelayed());
        existing.setExpectedResolutionDate(updatedItem.getExpectedResolutionDate());
        existing.setBusinessJustification(updatedItem.getBusinessJustification());
        existing.setProductId(updatedItem.getProductId());
        existing.setAffectedSystem(updatedItem.getAffectedSystem());
        existing.setBusinessService(updatedItem.getBusinessService());
        existing.setResolutionSummary(updatedItem.getResolutionSummary());
        existing.setClosureNotes(updatedItem.getClosureNotes());
        existing.setStakeholderUpdate(updatedItem.getStakeholderUpdate());
        existing.setSlaTarget(updatedItem.getSlaTarget());
        existing.setSlaBreachFlag(updatedItem.getSlaBreachFlag());
    }
}

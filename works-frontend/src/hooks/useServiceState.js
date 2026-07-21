// useServiceState.js — Service Desk domain state (TD-003 Phase 4)
// Extracted from AppShell: service requests, customers, types, tiers, CSAT.
import { useState } from 'react';

/**
 * @param {Object}   api
 * @param {string}   activeWorkspaceId
 * @param {Function} showToast
 * @param {Function} reportError
 */
export function useServiceState(api, activeWorkspaceId, showToast, reportError) {
  const [serviceTab, setServiceTab]       = useState('queues');
  const [serviceQueue, setServiceQueue]   = useState('open');
  const [serviceRequests, setServiceRequests] = useState([]);
  const [serviceCustomers, setServiceCustomers] = useState([]);
  const [serviceTypes, setServiceTypes]   = useState([]);
  const [serviceTiers, setServiceTiers]   = useState([]);
  const [serviceCsat, setServiceCsat]     = useState(null);
  const [newCustomer, setNewCustomer]     = useState(null);
  const [formDesignerTypeId, setFormDesignerTypeId] = useState(null);

  function fetchServiceRequests(q = serviceQueue) {
    api.raw(`/service/requests?workspaceId=${activeWorkspaceId}&queue=${q}`).then(r => r.json())
      .then(d => setServiceRequests(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceCustomers() {
    api.raw(`/service/customers?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceCustomers(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceTypes() {
    api.raw(`/service/request-types?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceTypes(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceTiers() {
    api.raw(`/service/sla-tiers?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceTiers(Array.isArray(d) ? d : [])).catch(reportError);
  }
  function fetchServiceCsat() {
    api.raw(`/service/csat?workspaceId=${activeWorkspaceId}`).then(r => r.json())
      .then(d => setServiceCsat(d)).catch(reportError);
  }
  function assignServiceRequest(id) {
    api.send(`/service/requests/${id}/assign`, { method: 'POST', body: JSON.stringify({}) })
      .then(() => { showToast('Assigned to you'); fetchServiceRequests(); })
      .catch(e => showToast(e.message || 'Assign failed', 'error'));
  }
  function transitionServiceRequest(id, status) {
    api.send(`/service/requests/${id}/transition`, { method: 'POST', body: JSON.stringify({ status }) })
      .then(() => { showToast('Request updated'); fetchServiceRequests(); })
      .catch(e => showToast(e.message || 'Update failed', 'error'));
  }
  function createServiceCustomer() {
    api.send(`/service/customers`, { method: 'POST', body: JSON.stringify({ ...newCustomer, workspaceId: activeWorkspaceId }) })
      .then(() => { showToast('Customer created'); setNewCustomer(null); fetchServiceCustomers(); })
      .catch(e => showToast(e.message || 'Create failed', 'error'));
  }

  return {
    serviceTab, setServiceTab,
    serviceQueue, setServiceQueue,
    serviceRequests, serviceCustomers, serviceTypes, serviceTiers, serviceCsat,
    newCustomer, setNewCustomer,
    formDesignerTypeId, setFormDesignerTypeId,
    fetchServiceRequests, fetchServiceCustomers, fetchServiceTypes,
    fetchServiceTiers, fetchServiceCsat,
    assignServiceRequest, transitionServiceRequest, createServiceCustomer,
  };
}

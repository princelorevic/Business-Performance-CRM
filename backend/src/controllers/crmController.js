import * as customers from '../services/customerService.js';
import * as leads from '../services/leadService.js';
import * as opps from '../services/opportunityService.js';
import * as quotes from '../services/quotationService.js';
import * as targets from '../services/targetService.js';

const cid = (req) => req.auth.companyId;

export const customerList = async (req, res) => res.json(await customers.listCustomers(cid(req), req.validQuery));
export const customerGet = async (req, res) => res.json(await customers.getCustomer(cid(req), req.params.id));
export const customerCreate = async (req, res) => res.status(201).json(await customers.createCustomer(req.auth, req.body, req.ip));
export const customerUpdate = async (req, res) => res.json(await customers.updateCustomer(req.auth, req.params.id, req.body, req.ip));
export const customerDelete = async (req, res) => { await customers.deleteCustomer(req.auth, req.params.id, req.ip); res.status(204).end(); };

export const leadList = async (req, res) => res.json(await leads.listLeads(cid(req), req.validQuery));
export const leadGet = async (req, res) => res.json(await leads.getLead(cid(req), req.params.id));
export const leadCreate = async (req, res) => res.status(201).json(await leads.createLead(req.auth, req.body, req.ip));
export const leadUpdate = async (req, res) => res.json(await leads.updateLead(req.auth, req.params.id, req.body, req.ip));
export const leadConvert = async (req, res) => res.json(await leads.convertLead(req.auth, req.params.id, req.ip));

export const oppList = async (req, res) => res.json(await opps.listOpportunities(cid(req), req.validQuery));
export const oppGet = async (req, res) => res.json(await opps.getOpportunity(cid(req), req.params.id));
export const oppCreate = async (req, res) => res.status(201).json(await opps.createOpportunity(req.auth, req.body, req.ip));
export const oppUpdate = async (req, res) => res.json(await opps.updateOpportunity(req.auth, req.params.id, req.body, req.ip));

export const quoteList = async (req, res) => res.json(await quotes.listQuotations(cid(req), req.validQuery));
export const quoteGet = async (req, res) => res.json(await quotes.getQuotation(cid(req), req.params.id));
export const quoteCreate = async (req, res) => res.status(201).json(await quotes.createQuotation(req.auth, req.body, req.ip));
export const quoteStatus = async (req, res) => res.json(await quotes.setQuotationStatus(req.auth, req.params.id, req.body.status, req.ip));

export const targetList = async (req, res) => {
  const personal = req.auth.role === 'sales';
  res.json({ data: await targets.listTargetsWithProgress(cid(req), { onlyUserId: personal ? req.auth.userId : null }) });
};
export const targetCreate = async (req, res) => res.status(201).json(await targets.createTarget(req.auth, req.body, req.ip));

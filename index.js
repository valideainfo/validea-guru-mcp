#!/usr/bin/env node
/**
 * Validea Guru Score History MCP Server
 *
 * Exposes Validea's guru strategy score history via the Model Context Protocol.
 *
 * Configuration (environment variables):
 *   GURU_API_BASE_URL  - Base URL of the ASP endpoint (default: http://mors.validea.com/stocks/guruscoreshistory_api.asp)
 *   GURU_API_KEY       - Optional API key forwarded to the ASP endpoint
 */

import http from "http";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE_URL =
  process.env.GURU_API_BASE_URL ||
  "http://mors.validea.com/stocks/guruscoreshistory_api.asp";

const SCREENER_BASE_URL =
  process.env.GURU_SCREENER_URL ||
  "http://mors.validea.com/stocks/guruscreener_api.asp";

const PORTFOLIO_PERF_URL =
  process.env.PORTFOLIO_PERF_URL ||
  "http://mors.validea.com/stocks/modelportfolioperf_api.asp";

const PORTFOLIO_HOLDINGS_URL =
  process.env.PORTFOLIO_HOLDINGS_URL ||
  "http://mors.validea.com/stocks/modelportfolioholdings_api.asp";

const ETF_PORTFOLIO_PERF_URL =
  process.env.ETF_PORTFOLIO_PERF_URL ||
  "http://mors.validea.com/stocks/etfportfolioperf_api.asp";

const ETF_PORTFOLIO_HOLDINGS_URL =
  process.env.ETF_PORTFOLIO_HOLDINGS_URL ||
  "http://mors.validea.com/stocks/etfportfolioholdings_api.asp";

const TRADE_SIGNALS_URL =
  process.env.TRADE_SIGNALS_URL ||
  "http://mors.validea.com/stocks/tradealerts_signals_api.asp";

const TRADE_ALERTS_URL =
  process.env.TRADE_ALERTS_URL ||
  "http://mors.validea.com/stocks/tradealerts_stocks_api.asp";

const ANALYSIS_BASE_URL =
  process.env.GURU_ANALYSIS_URL ||
  "http://mors.validea.com/stocks/guruanalysisfull_api.asp";

const FACTOR_RANKS_URL =
  process.env.FACTOR_RANKS_URL ||
  "http://mors.validea.com/stocks/factorranks_api.asp";

const FUNDAMENTALS_URL =
  process.env.FUNDAMENTALS_URL ||
  "http://mors.validea.com/stocks/fundamentals_api.asp";

const STOCK_OF_MONTH_URL =
  process.env.STOCK_OF_MONTH_URL ||
  "http://mors.validea.com/stocks/stockofmonth_api.asp";

const API_KEY = process.env.GURU_API_KEY || "";

const STRATEGIES = [
  { key: "benjamingraham",      label: "Value Investor" },
  { key: "warrenbuffett",       label: "Patient Investor" },
  { key: "daviddreman",         label: "Contrarian Investor" },
  { key: "kennethfisher",       label: "Price/Sales Investor" },
  { key: "johnneff",            label: "Low PE Investor" },
  { key: "josephpiotroski",     label: "Book/Market Investor" },
  { key: "joelgreenblatt",      label: "Earnings Yield Investor" },
  { key: "oshaughnvc2",         label: "Value Composite Investor" },
  { key: "tobiascarlisle",      label: "Acquirer's Multiple Investor" },
  { key: "danrasmussen",        label: "Private Equity Investor" },
  { key: "dashanhuang",         label: "Twin Momentum Investor" },
  { key: "parthamohanram",      label: "P/B Growth Investor" },
  { key: "martinzweig",         label: "Growth Investor" },
  { key: "williamoneil",        label: "Momentum Investor" },
  { key: "motleyfool",          label: "Small-Cap Growth Investor" },
  { key: "wesleygray",          label: "Quantitative Momentum Investor" },
  { key: "waynethorp",          label: "Earnings Revision Investor" },
  { key: "peterlynch",          label: "P/E Growth Investor" },
  { key: "jamesposhaughnessy",  label: "Growth/Value Investor" },
  { key: "pimvanvliet",         label: "Multi-Factor Investor" },
  { key: "patrickoshaughnessy", label: "Milennial Investor" },
  { key: "mebfaber",            label: "Shareholder Yield Investor" },
];

async function fetchGuruHistory(params) {
  const url = new URL(API_BASE_URL);
  if (params.ticker)           url.searchParams.set("ticker",           params.ticker);
  if (params.cusip)            url.searchParams.set("cusip",            params.cusip);
  if (params.securitymasterid) url.searchParams.set("securitymasterid", String(params.securitymasterid));
  if (params.startdate) url.searchParams.set("startdate", params.startdate);
  if (params.enddate)   url.searchParams.set("enddate",   params.enddate);
  if (params.frequency) url.searchParams.set("frequency", params.frequency);
  if (params.limit)     url.searchParams.set("limit",     String(params.limit));
  if (API_KEY)          url.searchParams.set("api_key",   API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  // Strip any trailing non-JSON content (e.g. stray text after the closing brace)
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchPortfolioPerf(params) {
  const url = new URL(PORTFOLIO_PERF_URL);
  if (params.portfolioid != null) url.searchParams.set("portfolioid", String(params.portfolioid));
  if (params.include_yearly)      url.searchParams.set("include_yearly", "true");
  if (params.startdate)           url.searchParams.set("startdate", params.startdate);
  if (params.enddate)             url.searchParams.set("enddate",   params.enddate);
  if (API_KEY)                    url.searchParams.set("api_key",   API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchPortfolioHoldings(params) {
  const url = new URL(PORTFOLIO_HOLDINGS_URL);
  if (params.portfolioid != null) url.searchParams.set("portfolioid", String(params.portfolioid));
  if (params.ticker)              url.searchParams.set("ticker",      params.ticker);
  if (params.asofdate)            url.searchParams.set("asofdate",    params.asofdate);
  if (API_KEY)                    url.searchParams.set("api_key",     API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchEtfPortfolioPerf(params) {
  const url = new URL(ETF_PORTFOLIO_PERF_URL);
  if (params.portfolioid != null) url.searchParams.set("portfolioid", String(params.portfolioid));
  if (params.include_yearly)      url.searchParams.set("include_yearly", "true");
  if (params.startdate)           url.searchParams.set("startdate", params.startdate);
  if (params.enddate)             url.searchParams.set("enddate",   params.enddate);
  if (API_KEY)                    url.searchParams.set("api_key",   API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchEtfPortfolioHoldings(params) {
  const url = new URL(ETF_PORTFOLIO_HOLDINGS_URL);
  if (params.portfolioid != null) url.searchParams.set("portfolioid", String(params.portfolioid));
  if (params.ticker)              url.searchParams.set("ticker",      params.ticker);
  if (params.asofdate)            url.searchParams.set("asofdate",    params.asofdate);
  if (API_KEY)                    url.searchParams.set("api_key",     API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchTradeSignals(params) {
  const url = new URL(TRADE_SIGNALS_URL);
  if (params.signalid != null) url.searchParams.set("signalid", String(params.signalid));
  if (params.sortby)           url.searchParams.set("sortby",   params.sortby);
  if (API_KEY)                 url.searchParams.set("api_key",  API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchTradeAlerts(params) {
  const url = new URL(TRADE_ALERTS_URL);
  if (params.ticker)    url.searchParams.set("ticker",     params.ticker);
  if (params.signalid != null) url.searchParams.set("signalid",  String(params.signalid));
  if (params.status)    url.searchParams.set("status",     params.status);
  if (params.from_date) url.searchParams.set("from_date",  params.from_date);
  if (params.to_date)   url.searchParams.set("to_date",    params.to_date);
  if (params.sortby)    url.searchParams.set("sortby",     params.sortby);
  if (params.limit)     url.searchParams.set("limit",      String(params.limit));
  if (API_KEY)          url.searchParams.set("api_key",    API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchScreener(params) {
  const url = new URL(SCREENER_BASE_URL);
  if (params.date)     url.searchParams.set("date",    params.date);
  if (params.limit)    url.searchParams.set("limit",   String(params.limit));
  if (params.sort_by)  url.searchParams.set("sortby",  params.sort_by);
  if (params.sort_dir) url.searchParams.set("sortdir", params.sort_dir);
  if (API_KEY)         url.searchParams.set("api_key", API_KEY);

  // Add guru score filters: { warrenbuffett: { min: 80 }, peterlynch: { min: 80 } }
  if (params.filters) {
    for (const [strategy, bounds] of Object.entries(params.filters)) {
      if (bounds.min != null) url.searchParams.set(`${strategy}_min`, String(bounds.min));
      if (bounds.max != null) url.searchParams.set(`${strategy}_max`, String(bounds.max));
    }
  }

  // Add factor rank filters: { value: { max: 20 }, quality: { max: 30 } }
  // Ranks are percentiles 1-100, lower = better (except negativeQuality).
  if (params.factor_filters) {
    for (const [factor, bounds] of Object.entries(params.factor_filters)) {
      if (bounds.min != null) url.searchParams.set(`${factor}_min`, String(bounds.min));
      if (bounds.max != null) url.searchParams.set(`${factor}_max`, String(bounds.max));
    }
  }

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchFactorRanks(params) {
  const url = new URL(FACTOR_RANKS_URL);
  if (params.ticker)           url.searchParams.set("ticker",           params.ticker);
  if (params.cusip)            url.searchParams.set("cusip",            params.cusip);
  if (params.securitymasterid) url.searchParams.set("securitymasterid", String(params.securitymasterid));
  if (API_KEY)                 url.searchParams.set("api_key",          API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

// Single-stock fundamentals retrieval (fundamentals_api.asp in retrieve mode).
async function fetchFundamentals(params) {
  const url = new URL(FUNDAMENTALS_URL);
  if (params.ticker)           url.searchParams.set("ticker",           params.ticker);
  if (params.cusip)            url.searchParams.set("cusip",            params.cusip);
  if (params.securitymasterid) url.searchParams.set("securitymasterid", String(params.securitymasterid));
  if (params.fields && params.fields.length) url.searchParams.set("fields", params.fields.join(","));
  if (API_KEY)                 url.searchParams.set("api_key",          API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

// Fundamentals screener (fundamentals_api.asp in screen mode — no identifier).
async function fetchFundamentalsScreen(params) {
  const url = new URL(FUNDAMENTALS_URL);
  // Numeric filters: { peRatio: { max: 15 }, roe: { min: 15 } }
  if (params.filters) {
    for (const [field, bounds] of Object.entries(params.filters)) {
      if (bounds.min != null) url.searchParams.set(`${field}_min`, String(bounds.min));
      if (bounds.max != null) url.searchParams.set(`${field}_max`, String(bounds.max));
    }
  }
  if (params.sector)   url.searchParams.set("sector",   params.sector);
  if (params.industry) url.searchParams.set("industry", params.industry);
  if (params.exchange) url.searchParams.set("exchange", params.exchange);
  if (params.country)  url.searchParams.set("country",  params.country);
  if (params.sort_by)  url.searchParams.set("sortby",   params.sort_by);
  if (params.sort_dir) url.searchParams.set("sortdir",  params.sort_dir);
  if (params.limit)    url.searchParams.set("limit",    String(params.limit));
  if (params.full)     url.searchParams.set("full",     "1");
  if (params.fields && params.fields.length) url.searchParams.set("fields", params.fields.join(","));
  if (API_KEY)         url.searchParams.set("api_key",  API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

// Resolve a user-supplied strategy reference (key, label, or common alias)
// to its canonical strategy key. Returns null if no confident match.
function resolveStrategyKey(input) {
  if (!input) return null;
  const q = String(input).toLowerCase().trim();

  // Exact key match
  const byKey = STRATEGIES.find((s) => s.key.toLowerCase() === q);
  if (byKey) return byKey.key;

  // Exact label match
  const byLabel = STRATEGIES.find((s) => s.label.toLowerCase() === q);
  if (byLabel) return byLabel.key;

  // Common name aliases -> key
  const ALIASES = {
    "graham": "benjamingraham", "benjamin graham": "benjamingraham",
    "buffett": "warrenbuffett", "warren buffett": "warrenbuffett",
    "dreman": "daviddreman", "david dreman": "daviddreman",
    "fisher": "kennethfisher", "kenneth fisher": "kennethfisher",
    "neff": "johnneff", "john neff": "johnneff",
    "piotroski": "josephpiotroski", "joseph piotroski": "josephpiotroski",
    "greenblatt": "joelgreenblatt", "joel greenblatt": "joelgreenblatt", "magic formula": "joelgreenblatt",
    "value composite": "oshaughnvc2", "oshaughnessy value": "oshaughnvc2",
    "carlisle": "tobiascarlisle", "tobias carlisle": "tobiascarlisle", "acquirer's multiple": "tobiascarlisle", "acquirers multiple": "tobiascarlisle",
    "rasmussen": "danrasmussen", "dan rasmussen": "danrasmussen", "private equity": "danrasmussen",
    "huang": "dashanhuang", "dashan huang": "dashanhuang", "twin momentum": "dashanhuang",
    "mohanram": "parthamohanram", "partha mohanram": "parthamohanram", "p/b growth": "parthamohanram",
    "zweig": "martinzweig", "martin zweig": "martinzweig",
    "oneil": "williamoneil", "o'neil": "williamoneil", "william oneil": "williamoneil", "william o'neil": "williamoneil",
    "motley fool": "motleyfool", "fool": "motleyfool",
    "gray": "wesleygray", "wesley gray": "wesleygray", "quantitative momentum": "wesleygray",
    "thorp": "waynethorp", "wayne thorp": "waynethorp", "earnings revision": "waynethorp",
    "lynch": "peterlynch", "peter lynch": "peterlynch",
    "james oshaughnessy": "jamesposhaughnessy", "growth/value": "jamesposhaughnessy", "growth value": "jamesposhaughnessy",
    "van vliet": "pimvanvliet", "vanvliet": "pimvanvliet", "pim van vliet": "pimvanvliet", "multi-factor": "pimvanvliet", "multi factor": "pimvanvliet",
    "patrick oshaughnessy": "patrickoshaughnessy", "millennial": "patrickoshaughnessy", "milennial": "patrickoshaughnessy",
    "faber": "mebfaber", "meb faber": "mebfaber", "shareholder yield": "mebfaber",
  };
  if (ALIASES[q]) return ALIASES[q];

  return null;
}

async function fetchGuruAnalysis(params) {
  const url = new URL(ANALYSIS_BASE_URL);
  if (params.ticker)   url.searchParams.set("ticker",   params.ticker);
  if (params.strategy) url.searchParams.set("strategy", params.strategy);
  if (API_KEY)         url.searchParams.set("api_key",  API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

async function fetchStockOfMonth(params) {
  const url = new URL(STOCK_OF_MONTH_URL);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  if (API_KEY) url.searchParams.set("api_key", API_KEY);

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

const listToolsHandler = async () => ({
  tools: [
    {
      name: "get_stock_of_month_candidates",
      description:
        "Generate the monthly 'Validea Stock of the Month' shortlist for Agora. " +
        "Returns a ranked list of US stocks (default 10) that score well across multiple guru " +
        "strategies, score well on Twin Momentum (Agora's primary Validea model), and pass " +
        "marquee-name strategies that are good to write about (Buffett, Lynch, Graham, etc). " +
        "Stocks already used as a Stock of the Month are automatically excluded via the pick log. " +
        "Each candidate includes the strategies it passes with strong interest (score 90+) and " +
        "some interest (80+), plus price, market cap, sector, industry, PE, yield and relative " +
        "strength — everything needed to write the 'why Validea likes it' bullets. " +
        "Pair this with get_guru_analysis for the detailed per-criterion reasoning on a chosen stock.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "integer",
            description: "Number of candidates to return (default 10, max 50).",
          },
          mincap: {
            type: "number",
            description: "Minimum market cap in $millions. Default 1000 (= $1 billion).",
          },
          maxpersector: {
            type: "integer",
            description:
              "Cap candidates per sector so the list has variety. Default 0 (no cap). " +
              "3 is a good setting for a monthly writeup list.",
          },
          country: {
            type: "string",
            description: "Country filter, default 'USA'. Pass 'ALL' to disable.",
          },
          includeused: {
            type: "boolean",
            description:
              "Set true to include stocks already used as a Stock of the Month. " +
              "Default false (previously picked stocks are excluded).",
          },
          date: {
            type: "string",
            description: "As-of date YYYY-MM-DD. Defaults to the most recent available.",
          },
        },
      },
    },
    {
      name: "get_guru_scores_history",
      description:
        "Retrieve the historical Validea guru strategy scores for a stock. " +
        "Returns daily, weekly, or monthly scores (0–100) for up to 22 guru strategies " +
        "over a specified date range (max 5 years per request). " +
        "Scores of 80+ indicate 'some interest'; scores of 90+ indicate 'strong interest'. " +
        "Each dated row also includes the Validea consensus index over time: valideaIndex " +
        "(the current/consensus index — the default), valideaIndexOld (the original Validea Index), " +
        "plus growthIndex, valueIndex, and totalGurus (number of strategies scoring 80+). " +
        "Use this to track how a stock's consensus Validea Index has moved over time. " +
        "Provide exactly one of: ticker (for active/known symbols), cusip (9-character CUSIP, " +
        "useful for delisted or acquired companies whose ticker is no longer valid), " +
        "or securitymasterid (Validea's internal integer ID, returned in prior responses).",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Stock ticker symbol (e.g. AAPL, MSFT, TSLA). Use for active securities with a valid ticker.",
          },
          cusip: {
            type: "string",
            description:
              "9-character CUSIP identifier. Use for delisted or acquired companies " +
              "whose ticker is no longer valid (e.g. '848637104' for Splunk/SPLK).",
          },
          securitymasterid: {
            type: "integer",
            description:
              "Validea internal security ID (integer). Returned as securityMasterId in prior API responses. " +
              "Use when you already have this ID from a previous lookup.",
          },
          startdate: {
            type: "string",
            description:
              "Start of date range in YYYY-MM-DD format. Defaults to 1 year ago.",
          },
          enddate: {
            type: "string",
            description:
              "End of date range in YYYY-MM-DD format. Defaults to today.",
          },
          frequency: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description:
              "Sampling frequency. 'daily' returns one row per trading day, " +
              "'weekly' returns the first record per week, 'monthly' the first per month. Default: daily.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 2500,
            description: "Maximum number of rows to return (default 2500, max 2500).",
          },
        },
        required: [],
      },
    },
    {
      name: "screen_guru_scores",
      description:
        "Screen all stocks in the Validea database by guru strategy score thresholds AND/OR factor rank percentiles. " +
        "Use this to answer questions like 'which stocks score over 80 on Warren Buffett?', " +
        "'find stocks that pass both Peter Lynch and Benjamin Graham', " +
        "'show me the top stocks by Validea Index', or " +
        "'find the cheapest quality stocks' (value_max + quality_max factor filters). " +
        "Returns matching tickers with all their scores, summary metrics, and factor ranks. " +
        "Defaults to the most recent available date. " +
        "Summary metrics returned per stock: " +
        "totalGurus = number of strategies where the stock scores 80+ (some interest); " +
        "totalGurusSI = number of strategies where the stock scores 90+ (strong interest only); " +
        "valideaIndex = the current/consensus composite ranking (weights strategies by historical performance — higher is better; this is the DEFAULT consensus score, from valideaindexnew); " +
        "valideaIndexOld = the original ('classic') Validea Index (from valideaindex) for comparison; " +
        "growthIndex = composite score across growth-oriented strategies; " +
        "valueIndex = composite score across value-oriented strategies; " +
        "fundamentalGrade = overall fundamental quality grade; " +
        "top5Gurus = score based on the top 5 best-performing guru strategies. " +
        "Each stock also returns a factorRanks object of percentile ranks (1-100, LOWER is better, " +
        "EXCEPT negativeQuality where HIGHER is better): value, quality, momentum, totalMomentum, " +
        "lowVolatility, negativeQuality, fundamentalMomentum, shareholderYield, overall, total, marketCap, " +
        "peRatio, priceToSales, priceToBook, priceToCashFlow, evToEbitda, returnOnEquity, returnOnTotalCapital, " +
        "grossMargin, netMargin, beta, standardDeviation, debt, cashFlow, eps, relativeStrength, " +
        "epsVariability, salesVariability.",
      inputSchema: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description:
              "Guru score filters keyed by strategy name. Each value can have 'min' and/or 'max' (0-100). " +
              "Example: { \"warrenbuffett\": { \"min\": 80 }, \"peterlynch\": { \"min\": 80 } }",
            additionalProperties: {
              type: "object",
              properties: {
                min: { type: "integer", minimum: 0, maximum: 100 },
                max: { type: "integer", minimum: 0, maximum: 100 },
              },
            },
          },
          factor_filters: {
            type: "object",
            description:
              "Factor rank filters keyed by factor name. Ranks are percentiles 1-100 where LOWER is better " +
              "(except negativeQuality where HIGHER is better), so typically use 'max' to keep only top-ranked stocks. " +
              "Example: { \"value\": { \"max\": 20 }, \"quality\": { \"max\": 30 } } finds stocks in the best 20% on value " +
              "and best 30% on quality. Valid factor keys: value, quality, momentum, totalMomentum, lowVolatility, " +
              "negativeQuality, fundamentalMomentum, shareholderYield, overall, total, marketCap, peRatio, priceToSales, " +
              "priceToBook, priceToCashFlow, evToEbitda, returnOnEquity, returnOnTotalCapital, grossMargin, netMargin, " +
              "beta, standardDeviation, debt, cashFlow, eps, relativeStrength, epsVariability, salesVariability.",
            additionalProperties: {
              type: "object",
              properties: {
                min: { type: "integer", minimum: 1, maximum: 100 },
                max: { type: "integer", minimum: 1, maximum: 100 },
              },
            },
          },
          date: {
            type: "string",
            description: "Date to screen on in YYYY-MM-DD format. Defaults to most recent available date.",
          },
          sort_by: {
            type: "string",
            description:
              "Column to sort results by. Use a strategy key (e.g. 'warrenbuffett'), a summary metric " +
              "(totalgurusnew, valideaindexnew [current/consensus], valideaindex [original], growthindex, valueindex, " +
              "fundamentalgrade, top5gurus), or a factor key (value, quality, momentum, lowVolatility, negativeQuality, ...). " +
              "Default: totalgurusnew. Guru/summary columns sort best-first as DESC; factor ranks sort best-first as ASC " +
              "(lower percentile = better), except negativeQuality. Use sort_dir to override.",
          },
          sort_dir: {
            type: "string",
            enum: ["asc", "desc"],
            description:
              "Optional override of sort direction for sort_by. If omitted, guru/summary columns default to desc and " +
              "factor rank columns default to asc (best-first), except negativeQuality which defaults to desc.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 500,
            description: "Maximum number of results to return (default 100, max 500).",
          },
        },
        required: [],
      },
    },
    {
      name: "list_model_portfolios",
      description:
        "List all active Validea model portfolios with summary performance statistics. " +
        "Portfolios are factor-based strategies inspired by legendary investors (Buffett, Lynch, Graham, etc.). " +
        "Each strategy is offered in multiple versions: 10-stock or 20-stock, and " +
        "monthly/quarterly/annual/tax-efficient rebalancing — use the portfolioid to drill into a specific version. " +
        "Returns portfolioid (needed for get_portfolio_performance and get_portfolio_holdings), " +
        "name, guru it is based on, size, rebalancing type, inception date, and key stats: " +
        "annualized inception return, YTD, 1yr, 3yr, 5yr, 10yr vs S&P 500, beta, accuracy, sharpe ratio, max drawdown. " +
        "All returns are decimals (e.g. 0.12 = 12%).",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_portfolio_performance",
      description:
        "Get detailed performance statistics for a specific Validea model portfolio. " +
        "Standard mode (portfolioid only): returns all period returns — YTD, 1-week, 1-month, 3-month, " +
        "6-month, 1-year, 3-year, 5-year, 10-year, and since inception — all vs S&P 500, plus full risk metrics " +
        "(beta, accuracy, sharpe ratio, standard deviation, max drawdown, days to recover, turnover, skewness, kurtosis). " +
        "Set include_yearly=true to also get year-by-year returns from 2003 to present. " +
        "Custom period mode (portfolioid + startdate + enddate): calculates portfolio and S&P 500 return over any date range " +
        "from daily portfolio values; also returns annualized return for periods over 1 year. " +
        "Use list_model_portfolios first to find the correct portfolioid. All returns are decimals (0.12 = 12%).",
      inputSchema: {
        type: "object",
        properties: {
          portfolioid: {
            type: "integer",
            description: "Portfolio ID from list_model_portfolios. Required.",
          },
          include_yearly: {
            type: "boolean",
            description: "Include year-by-year returns from 2003 to present. Default false.",
          },
          startdate: {
            type: "string",
            description: "Start date for custom period in YYYY-MM-DD format. Requires enddate.",
          },
          enddate: {
            type: "string",
            description: "End date for custom period in YYYY-MM-DD format. Requires startdate.",
          },
        },
        required: ["portfolioid"],
      },
    },
    {
      name: "get_portfolio_holdings",
      description:
        "Get the stock holdings for a specific Validea model portfolio. " +
        "Returns current holdings by default (all positions not yet removed), " +
        "or holdings as of any historical date using asofdate. " +
        "Each holding includes ticker, company name, date added to portfolio, " +
        "start price, guru score at time of entry, and number of guru strategies passing at entry. " +
        "Use list_model_portfolios first to find the correct portfolioid.",
      inputSchema: {
        type: "object",
        properties: {
          portfolioid: {
            type: "integer",
            description: "Portfolio ID from list_model_portfolios. Required.",
          },
          asofdate: {
            type: "string",
            description: "Return holdings as of this date in YYYY-MM-DD format. Defaults to current holdings.",
          },
        },
        required: ["portfolioid"],
      },
    },
    {
      name: "get_portfolio_stock_history",
      description:
        "Look up which Validea model portfolios a stock has been (or currently is) a member of. " +
        "Returns all historical and current portfolio memberships for the ticker across every portfolio " +
        "(different strategies, sizes, rebalancing periods), with dates added/removed, " +
        "whether it is currently held, and the guru score at time of entry. " +
        "Useful for questions like 'which portfolios currently hold AAPL?', " +
        "'has NVDA ever been in the Buffett portfolio?', or 'show me all portfolios MSFT has been in'.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Stock ticker symbol (e.g. AAPL, MSFT, NVDA).",
          },
        },
        required: ["ticker"],
      },
    },
    {
      name: "list_etf_portfolios",
      description:
        "List all active Validea ETF model portfolios with summary performance statistics. " +
        "These are ETF-based strategies (e.g. Factor Rotation - Value/Momentum/Macro/Composite) that hold a " +
        "weighted basket of ETFs rather than individual stocks. " +
        "Returns portfolioid (needed for get_etf_portfolio_performance and get_etf_portfolio_holdings), " +
        "name, portfoliobased, portfoliotype, investingstyle, inception date, and key stats: " +
        "annualized inception return, YTD, 1yr, 3yr, 5yr, 10yr vs S&P 500, beta, accuracy, sharpe, max drawdown. " +
        "All returns are decimals (0.12 = 12%). Analogous to list_model_portfolios but for ETF portfolios.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_etf_portfolio_performance",
      description:
        "Get detailed performance statistics for a specific Validea ETF model portfolio. " +
        "Standard mode (portfolioid only): all period returns — YTD, 1-week, 1-month, 3-month, 6-month, 1-year, " +
        "3-year, 5-year, 10-year, and since inception — all vs S&P 500, plus risk metrics (beta, accuracy, sharpe, " +
        "standard deviation, max drawdown, turnover, skewness, kurtosis, market correlation). " +
        "Set include_yearly=true for year-by-year returns. " +
        "Custom period mode (portfolioid + startdate + enddate): portfolio and S&P 500 return over any date range. " +
        "Use list_etf_portfolios first to find the correct portfolioid. All returns are decimals (0.12 = 12%). " +
        "Analogous to get_portfolio_performance but for ETF portfolios (no size/rebalancing or days-to-recover fields).",
      inputSchema: {
        type: "object",
        properties: {
          portfolioid: {
            type: "integer",
            description: "ETF portfolio ID from list_etf_portfolios. Required.",
          },
          include_yearly: {
            type: "boolean",
            description: "Include year-by-year returns. Default false.",
          },
          startdate: {
            type: "string",
            description: "Start date for custom period in YYYY-MM-DD format. Requires enddate.",
          },
          enddate: {
            type: "string",
            description: "End date for custom period in YYYY-MM-DD format. Requires startdate.",
          },
        },
        required: ["portfolioid"],
      },
    },
    {
      name: "get_etf_portfolio_holdings",
      description:
        "Get the ETF holdings for a specific Validea ETF model portfolio. " +
        "ETF portfolios are snapshot/rebalance-based, so this returns the latest holdings snapshot by default, " +
        "or the snapshot as of any historical date via asofdate. " +
        "Each holding includes ticker, ETF name, asset class, target weight (decimal, e.g. 0.20 = 20%), " +
        "start/end price for the snapshot period, and the ETF's current price. " +
        "Use list_etf_portfolios first to find the correct portfolioid.",
      inputSchema: {
        type: "object",
        properties: {
          portfolioid: {
            type: "integer",
            description: "ETF portfolio ID from list_etf_portfolios. Required.",
          },
          asofdate: {
            type: "string",
            description: "Return the holdings snapshot as of this date (YYYY-MM-DD). Defaults to the latest snapshot.",
          },
        },
        required: ["portfolioid"],
      },
    },
    {
      name: "get_etf_portfolio_stock_history",
      description:
        "Look up which Validea ETF model portfolios a given ETF has been (or currently is) a member of. " +
        "Returns one row per ETF portfolio the ETF has appeared in, with the first date added, the last date seen, " +
        "and whether it is currently held (in the portfolio's latest snapshot). " +
        "Useful for questions like 'which ETF portfolios currently hold SPY?' or 'where has XMLV been used?'. " +
        "Provide an ETF ticker.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "ETF ticker symbol (e.g. SPY, XMLV, RPG).",
          },
        },
        required: ["ticker"],
      },
    },
    {
      name: "list_trade_signals",
      description:
        "List all Validea trade alert signals with their historical performance statistics. " +
        "Each signal is a rules-based buy trigger tied to a guru strategy and a specific holding period (1, 3, or 6 months). " +
        "Use this to find the best-performing signals overall, or to look up a specific signal's stats. " +
        "Returns for each signal: signal name, holding period, annualized return (based on target period), " +
        "return vs S&P 500, accuracy (% of alerts that were positive), accuracy vs S&P 500, and alert count. " +
        "Sortable by annualized return (default), raw return by period, accuracy, or alert count. " +
        "Pass signalid to get full stats across all four measurement periods (1m, 3m, 6m, 1yr) including highs and lows. " +
        "All returns are decimals (0.12 = 12%). Accuracy is 0–1 (0.73 = 73%).",
      inputSchema: {
        type: "object",
        properties: {
          signalid: {
            type: "integer",
            description: "Optional. Return full detail for a single signal instead of the list.",
          },
          sortby: {
            type: "string",
            enum: ["annreturn","return_1m","return_3m","return_6m","return_1y","accuracy_1m","accuracy_3m","accuracy_6m","accuracy_1y","count_1m","count_3m","count_6m","count_1y"],
            description: "Sort the signal list by this metric, descending. Default: annreturn (annualized return based on each signal's target holding period).",
          },
        },
        required: [],
      },
    },
    {
      name: "get_trade_alerts",
      description:
        "Search and filter Validea trade alert stock picks. " +
        "A trade alert is a specific stock recommended by a signal on a specific date, with a defined holding period. " +
        "Returns open alerts (still within holding period, no exit price yet) by default. " +
        "Use status=closed for completed alerts with final returns, or status=all for both. " +
        "Filter by ticker to see all alerts ever issued for a stock. " +
        "Filter by signalid (from list_trade_signals) to see all alerts for one signal. " +
        "Filter by date range (from_date / to_date) to see alerts issued within a period. " +
        "Sort by date (newest first by default) or by performance (best/worst return). " +
        "Each alert includes: signal name, holding period, ticker, company, sector, industry, " +
        "alert date, target end date, start price, current/end price, alert return, S&P 500 return over same period, " +
        "and the signal's historical average return for that holding period. " +
        "All returns are decimals (0.12 = 12%).",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "closed", "all"],
            description: "open = alerts still within holding period (default); closed = completed alerts with final returns; all = both.",
          },
          ticker: {
            type: "string",
            description: "Filter to alerts for a specific stock ticker (e.g. AAPL).",
          },
          signalid: {
            type: "integer",
            description: "Filter to alerts from a specific signal. Use list_trade_signals to find signalid values.",
          },
          from_date: {
            type: "string",
            description: "Return only alerts issued on or after this date (YYYY-MM-DD).",
          },
          to_date: {
            type: "string",
            description: "Return only alerts issued on or before this date (YYYY-MM-DD).",
          },
          sortby: {
            type: "string",
            enum: ["date_desc", "date_asc", "perf_desc", "perf_asc"],
            description: "Sort order. date_desc = newest alerts first (default); perf_desc = best return first; perf_asc = worst return first.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 500,
            description: "Maximum number of alerts to return. Default 100, max 500.",
          },
        },
        required: [],
      },
    },
    {
      name: "list_guru_strategies",
      description:
        "List all 22 Validea guru investment strategies with their key names and labels. " +
        "Useful for understanding what each score column in get_guru_scores_history represents.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "get_guru_analysis",
      description:
        "Get the detailed REASONING behind Validea's guru scores for a stock — the criterion-by-criterion " +
        "analysis that explains WHY a stock passes or fails each strategy (not just the numeric score). " +
        "This is the same analysis shown on Validea's full guru report page. " +
        "Provide a ticker to get the breakdown for all 22 strategies, or add a strategy to focus on just one " +
        "(e.g. strategy='twin momentum' or strategy='dashanhuang' for the Twin Momentum / Dashan Huang model). " +
        "Each strategy returns its score, an overall verdict (Strong Interest / Some Interest / No Interest), " +
        "pass/fail/neutral counts, and a criteria[] array. Each criterion has: the test name, the result " +
        "(PASS / FAIL / NEUTRAL, or the BONUS variants), a passed boolean (true/false/null for neutral), and a " +
        "plain-language analysis explaining how the stock measured up. " +
        "Use this for questions like 'why does AAPL fail the Value Investor model?', " +
        "'give me the full Twin Momentum analysis of NVDA', or 'summarize how AAPL scores across all guru strategies'.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Stock ticker to analyze (e.g. AAPL).",
          },
          strategy: {
            type: "string",
            description:
              "Optional. Limit the analysis to a single strategy. Accepts a strategy key (e.g. dashanhuang), " +
              "its label (e.g. 'Twin Momentum Investor'), or a common name (e.g. 'twin momentum', 'buffett', " +
              "'graham', 'peter lynch'). Omit to get all 22 strategies. Use list_guru_strategies to see all keys/labels.",
          },
        },
        required: ["ticker"],
      },
    },
    {
      name: "get_factor_ranks",
      description:
        "Get Validea's individual factor rank percentiles for a single stock (from the factorranks table). " +
        "These rank the stock against the whole universe on each factor. Every value is a percentile from " +
        "1-100 where LOWER is better (top of the universe), EXCEPT negativeQuality where HIGHER is better. " +
        "marketCap here is a size percentile (descriptive, not a quality signal). " +
        "Returns a factorRanks object with: value, quality, momentum, totalMomentum, lowVolatility, " +
        "negativeQuality, fundamentalMomentum, shareholderYield, overall, total, marketCap, peRatio, " +
        "priceToSales, priceToBook, priceToCashFlow, evToEbitda, returnOnEquity, returnOnTotalCapital, " +
        "grossMargin, netMargin, beta, standardDeviation, debt, cashFlow, eps, relativeStrength, " +
        "epsVariability, salesVariability. Also returns the raw marketCap value, the asOfDate, and up to " +
        "six comparable companies (similar-profile peers). " +
        "Use this for questions like 'how does AAPL rank on value and quality?', " +
        "'is NVDA expensive?' (check value/peRatio/priceToSales percentiles), or " +
        "'what's TSLA's momentum and low-volatility ranking?'. " +
        "To screen or rank the whole universe by these factors instead, use screen_guru_scores with factor_filters. " +
        "Provide exactly one of: ticker, cusip (for delisted/acquired names), or securitymasterid.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Stock ticker symbol (e.g. AAPL, MSFT, TSLA).",
          },
          cusip: {
            type: "string",
            description:
              "9-character CUSIP identifier. Use for delisted or acquired companies whose ticker is no longer valid.",
          },
          securitymasterid: {
            type: "integer",
            description:
              "Validea internal security ID (integer). Use when you already have this ID from a previous lookup.",
          },
        },
        required: [],
      },
    },
    {
      name: "get_fundamentals",
      description:
        "Get Validea's fundamental data for a single stock from the CompanyFundamentalsMaster table. " +
        "Returns an identity block (ticker, company, sector, industry, exchange, country) plus a comprehensive " +
        "'fundamentals' object spanning valuation (peRatio, forwardPE, priceToBook, priceToSales, evToEbitda, " +
        "earningsYield, acquirersMultiple, cape, pegRatio, ...), profitability/quality (roe, roa, roic, profitMargin, " +
        "grossMargin, operatingEarnings, ...), growth (revGrowth, epsGrowth, avg5YEpsGrowth, projected5YEpsGrowth, ...), " +
        "financial strength (currentRatio, totalDebtToEquity, debtToEbitda, totalDebt, totalAssets, equity, ...), " +
        "per-share/income (eps, sales, dividend, yield, divPerShare, cfps, fcfpsTtm, shareholderYield, netPayoutYield), " +
        "momentum (relStr3Months, relStr6Months, twelveMinusOneReturn, beta, standardDeviation), " +
        "analyst estimates/revisions (numAnalysts, epsEy0, epsEy1, epsEy0UpRevisions, epsEy0DownRevisions, ...), " +
        "ownership (insiderOwn, institutionalOwn), and composite factor ranks (valueRank, qualityRank, valuePercentile, " +
        "qualityPercentile, earningsYieldRank, magicFormulaRank, fscore, gscore, ...). " +
        "Use for questions like 'what is NVDA's P/E, ROE, and debt-to-equity?' or 'show me AAPL's full fundamentals'. " +
        "Provide exactly one of: ticker, cusip, or securitymasterid. " +
        "Optionally pass fields=[...] to return only specific fundamental keys.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: { type: "string", description: "Stock ticker symbol (e.g. AAPL)." },
          cusip: { type: "string", description: "9-character CUSIP (for delisted/acquired names)." },
          securitymasterid: { type: "integer", description: "Validea internal security ID." },
          fields: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional. Return only these fundamental field keys (e.g. [\"peRatio\",\"roe\",\"priceToBook\"]). " +
              "Omit to return the full fundamentals set.",
          },
        },
        required: [],
      },
    },
    {
      name: "screen_fundamentals",
      description:
        "Screen the entire Validea universe by fundamental metrics from CompanyFundamentalsMaster. " +
        "Use for questions like 'find stocks with P/E under 15 and ROE over 20%', " +
        "'cheap stocks by EV/EBITDA in the technology sector', or 'highest shareholder yield large caps'. " +
        "Filter with a filters object keyed by fundamental field, each with min and/or max. " +
        "Filterable/sortable numeric fields include: marketCap, price, beta, standardDeviation, peRatio, forwardPE, " +
        "priceToBook, priceToSales, priceToCashFlow, evToEbitda, earningsYield, acquirersMultiple, cape, pegRatio, " +
        "roe, roa, roic, profitMargin, grossMargin, revGrowth, epsGrowth, avg5YEpsGrowth, currentRatio, " +
        "totalDebtToEquity, ltDebtToEquity, debtToEbitda, payoutRatio, eps, sales, dividend, yield, shareholderYield, " +
        "netPayoutYield, relStr6Months, twelveMinusOneReturn, numAnalysts, valuePercentile, qualityPercentile, " +
        "magicFormulaRank, fscore, gscore (see get_fundamentals for the full field list). " +
        "Optionally narrow by sector, industry, exchange, or country (case-insensitive substring match). " +
        "Sort by any numeric field via sort_by (default marketCap) and sort_dir (asc/desc, default desc). " +
        "Each row returns identity + a core set of fundamentals plus whatever fields you filtered/sorted on; " +
        "pass fields=[...] to choose exactly which fundamentals to return, or full=true to return them all.",
      inputSchema: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description:
              "Fundamental filters keyed by field name, each with 'min' and/or 'max'. " +
              "Example: { \"peRatio\": { \"max\": 15 }, \"roe\": { \"min\": 20 }, \"marketCap\": { \"min\": 2000 } }. " +
              "Note money values (marketCap, sales, totalDebt, ...) are in the table's native units (millions).",
            additionalProperties: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" },
              },
            },
          },
          sector:   { type: "string", description: "Filter to a sector (substring match, e.g. 'Technology')." },
          industry: { type: "string", description: "Filter to an industry (substring match)." },
          exchange: { type: "string", description: "Filter to an exchange (substring match, e.g. 'NASDAQ')." },
          country:  { type: "string", description: "Filter to a country (substring match)." },
          sort_by: {
            type: "string",
            description: "Numeric fundamental field to sort by (default marketCap).",
          },
          sort_dir: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction (default desc). Use asc for 'cheapest'/'lowest' style screens.",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Optional. Fundamental field keys to return per row (in addition to identity + filtered/sorted fields).",
          },
          full: {
            type: "boolean",
            description: "Return the complete fundamentals set for each row instead of the core subset. Default false.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 200,
            description: "Maximum rows to return (default 50, max 200).",
          },
        },
        required: [],
      },
    },
  ],
});

const callToolHandler = async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_stock_of_month_candidates") {
    try {
      const data = await fetchStockOfMonth({
        limit:        args?.limit,
        mincap:       args?.mincap,
        maxpersector: args?.maxpersector,
        country:      args?.country,
        includeused:  args?.includeused ? "1" : "",
        date:         args?.date,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "list_model_portfolios") {
    try {
      const data = await fetchPortfolioPerf({});
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_portfolio_performance") {
    if (!args?.portfolioid) {
      return { isError: true, content: [{ type: "text", text: "Error: portfolioid is required." }] };
    }
    try {
      const data = await fetchPortfolioPerf({
        portfolioid:    args.portfolioid,
        include_yearly: args.include_yearly,
        startdate:      args.startdate,
        enddate:        args.enddate,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_portfolio_holdings") {
    if (!args?.portfolioid) {
      return { isError: true, content: [{ type: "text", text: "Error: portfolioid is required." }] };
    }
    try {
      const data = await fetchPortfolioHoldings({
        portfolioid: args.portfolioid,
        asofdate:    args.asofdate,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_portfolio_stock_history") {
    if (!args?.ticker) {
      return { isError: true, content: [{ type: "text", text: "Error: ticker is required." }] };
    }
    try {
      const data = await fetchPortfolioHoldings({ ticker: args.ticker });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "list_etf_portfolios") {
    try {
      const data = await fetchEtfPortfolioPerf({});
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_etf_portfolio_performance") {
    if (!args?.portfolioid) {
      return { isError: true, content: [{ type: "text", text: "Error: portfolioid is required." }] };
    }
    try {
      const data = await fetchEtfPortfolioPerf({
        portfolioid:    args.portfolioid,
        include_yearly: args.include_yearly,
        startdate:      args.startdate,
        enddate:        args.enddate,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_etf_portfolio_holdings") {
    if (!args?.portfolioid) {
      return { isError: true, content: [{ type: "text", text: "Error: portfolioid is required." }] };
    }
    try {
      const data = await fetchEtfPortfolioHoldings({
        portfolioid: args.portfolioid,
        asofdate:    args.asofdate,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_etf_portfolio_stock_history") {
    if (!args?.ticker) {
      return { isError: true, content: [{ type: "text", text: "Error: ticker is required." }] };
    }
    try {
      const data = await fetchEtfPortfolioHoldings({ ticker: args.ticker });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "list_trade_signals") {
    try {
      const data = await fetchTradeSignals({
        signalid: args?.signalid,
        sortby:   args?.sortby,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_trade_alerts") {
    try {
      const data = await fetchTradeAlerts({
        ticker:    args?.ticker,
        signalid:  args?.signalid,
        status:    args?.status,
        from_date: args?.from_date,
        to_date:   args?.to_date,
        sortby:    args?.sortby,
        limit:     args?.limit,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "screen_guru_scores") {
    try {
      const data = await fetchScreener({
        filters:        args?.filters,
        factor_filters: args?.factor_filters,
        date:           args?.date,
        sort_by:        args?.sort_by,
        sort_dir:       args?.sort_dir,
        limit:          args?.limit,
      });

      if (!data.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `API error [${data.error}]: ${data.message}` }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Fetch error: ${err.message}` }],
      };
    }
  }

  if (name === "list_guru_strategies") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ strategies: STRATEGIES }, null, 2),
        },
      ],
    };
  }

  if (name === "get_guru_analysis") {
    if (!args?.ticker) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: ticker is required." }],
      };
    }

    let strategyKey;
    if (args.strategy) {
      strategyKey = resolveStrategyKey(args.strategy);
      if (!strategyKey) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error: could not match strategy "${args.strategy}" to a known guru. ` +
                  `Call list_guru_strategies for valid keys/labels, or omit strategy to get all 22.`,
          }],
        };
      }
    }

    try {
      const data = await fetchGuruAnalysis({ ticker: args.ticker, strategy: strategyKey });
      if (!data.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `API error [${data.error}]: ${data.message}` }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Fetch error: ${err.message}` }],
      };
    }
  }

  if (name === "get_fundamentals") {
    const identifiers = [args?.ticker, args?.cusip, args?.securitymasterid].filter(Boolean);
    if (identifiers.length === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide exactly one of: ticker, cusip, or securitymasterid." }],
      };
    }
    if (identifiers.length > 1) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide only one of: ticker, cusip, or securitymasterid — not multiple." }],
      };
    }
    try {
      const data = await fetchFundamentals({
        ticker:           args.ticker,
        cusip:            args.cusip,
        securitymasterid: args.securitymasterid,
        fields:           args.fields,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error [${data.error}]: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "screen_fundamentals") {
    try {
      const data = await fetchFundamentalsScreen({
        filters:  args?.filters,
        sector:   args?.sector,
        industry: args?.industry,
        exchange: args?.exchange,
        country:  args?.country,
        sort_by:  args?.sort_by,
        sort_dir: args?.sort_dir,
        fields:   args?.fields,
        full:     args?.full,
        limit:    args?.limit,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error [${data.error}]: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_factor_ranks") {
    const identifiers = [args?.ticker, args?.cusip, args?.securitymasterid].filter(Boolean);
    if (identifiers.length === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide exactly one of: ticker, cusip, or securitymasterid." }],
      };
    }
    if (identifiers.length > 1) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide only one of: ticker, cusip, or securitymasterid — not multiple." }],
      };
    }

    try {
      const data = await fetchFactorRanks({
        ticker:           args.ticker,
        cusip:            args.cusip,
        securitymasterid: args.securitymasterid,
      });
      if (!data.ok) {
        return { isError: true, content: [{ type: "text", text: `API error [${data.error}]: ${data.message}` }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    } catch (err) {
      return { isError: true, content: [{ type: "text", text: `Fetch error: ${err.message}` }] };
    }
  }

  if (name === "get_guru_scores_history") {
    const identifiers = [args?.ticker, args?.cusip, args?.securitymasterid].filter(Boolean);
    if (identifiers.length === 0) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide exactly one of: ticker, cusip, or securitymasterid." }],
      };
    }
    if (identifiers.length > 1) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: provide only one of: ticker, cusip, or securitymasterid — not multiple." }],
      };
    }

    try {
      const data = await fetchGuruHistory({
        ticker:           args.ticker,
        cusip:            args.cusip,
        securitymasterid: args.securitymasterid,
        startdate:        args.startdate,
        enddate:          args.enddate,
        frequency:        args.frequency,
        limit:            args.limit,
      });

      if (!data.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `API error [${data.error}]: ${data.message}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Fetch error: ${err.message}` }],
      };
    }
  }

  return {
    isError: true,
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
  };
};

// Build a fresh Server per connection. A Protocol instance can only ever be bound
// to ONE transport — the SDK throws "Already connected to a transport" on a second
// connect() — so a single shared Server would serve the first session after startup
// and fail every session after it.
function createServer() {
  const server = new Server(
    { name: "validea-guru-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
  server.setRequestHandler(CallToolRequestSchema, callToolHandler);
  return server;
}

if (process.env.PORT) {
  // Remote mode: HTTP server (Azure App Service, etc.)
  // Supports two transports:
  //   /sse + /message — legacy HTTP+SSE transport (kept for backwards compat)
  //   /mcp            — modern Streamable HTTP transport (preferred for new clients)
  const PORT = parseInt(process.env.PORT, 10);
  const sessions = new Map();           // sessionId -> SSEServerTransport
  const streamableSessions = new Map(); // sessionId -> StreamableHTTPServerTransport

  // Never let a single bad request take down the whole server. Without these,
  // an error thrown inside the async request handler (e.g. a client reconnecting
  // with a stale mcp-session-id after a restart) becomes an unhandled rejection
  // that crashes the Node process — which Azure restarts, causing a crash-loop.
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection (ignored, server stays up):", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception (ignored, server stays up):", err);
  });

  const httpServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost`);

      if (req.method === "GET" && url.pathname === "/sse") {
        const transport = new SSEServerTransport("/message", res);
        sessions.set(transport.sessionId, transport);
        transport.onclose = () => {
          sessions.delete(transport.sessionId);
          clearInterval(keepAliveInterval);
        };
        // Send a comment ping every 30s to keep the connection alive through Azure timeouts
        const keepAliveInterval = setInterval(() => {
          if (!res.writableEnded) res.write(": ping\n\n");
        }, 30000);
        await createServer().connect(transport);

      } else if (req.method === "POST" && url.pathname === "/message") {
        const sessionId = url.searchParams.get("sessionId");
        const transport = sessions.get(sessionId);
        if (transport) {
          await transport.handlePostMessage(req, res);
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Session not found");
        }

      } else if (url.pathname === "/mcp") {
        const sessionId = req.headers["mcp-session-id"];

        if (sessionId) {
          // Existing session: must still be in memory. If the process restarted,
          // the map is empty — tell the client to re-initialize (404) instead of
          // building a half-open transport that throws on a non-initialize request.
          const transport = streamableSessions.get(sessionId);
          if (!transport) {
            res.writeHead(404, {
              "Content-Type": "application/json",
              "mcp-session-id": sessionId,
            });
            res.end(JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32001, message: "Session not found or expired; re-initialize" },
              id: null,
            }));
            return;
          }
          await transport.handleRequest(req, res);
          return;
        }

        // No session id: this must be a fresh initialize (POST).
        if (req.method !== "POST") {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Bad Request: missing or invalid Mcp-Session-Id");
          return;
        }
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => streamableSessions.set(sid, transport),
        });
        transport.onclose = () => {
          if (transport.sessionId) streamableSessions.delete(transport.sessionId);
        };
        await createServer().connect(transport);
        await transport.handleRequest(req, res);

      } else if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", server: "validea-guru-mcp" }));

      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
    } catch (err) {
      console.error(`Request handler error on ${req.method} ${req.url}:`, err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });

  // Malformed HTTP / socket errors must not bubble up and crash the process either.
  httpServer.on("clientError", (err, socket) => {
    if (socket.writable && !socket.destroyed) {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
    }
  });

  httpServer.listen(PORT, () => {
    console.error(`Validea Guru MCP server listening on port ${PORT}`);
  });

} else {
  // Local mode: stdio transport (for Claude Desktop direct use)
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}

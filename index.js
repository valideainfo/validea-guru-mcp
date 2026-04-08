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
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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

const TRADE_SIGNALS_URL =
  process.env.TRADE_SIGNALS_URL ||
  "http://mors.validea.com/stocks/tradealerts_signals_api.asp";

const TRADE_ALERTS_URL =
  process.env.TRADE_ALERTS_URL ||
  "http://mors.validea.com/stocks/tradealerts_stocks_api.asp";

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
  url.searchParams.set("ticker", params.ticker);
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
  if (params.date)    url.searchParams.set("date",    params.date);
  if (params.limit)   url.searchParams.set("limit",   String(params.limit));
  if (params.sort_by) url.searchParams.set("sortby",  params.sort_by);
  if (API_KEY)        url.searchParams.set("api_key", API_KEY);

  // Add score filters: { warrenbuffett: { min: 80 }, peterlynch: { min: 80 } }
  if (params.filters) {
    for (const [strategy, bounds] of Object.entries(params.filters)) {
      if (bounds.min != null) url.searchParams.set(`${strategy}_min`, String(bounds.min));
      if (bounds.max != null) url.searchParams.set(`${strategy}_max`, String(bounds.max));
    }
  }

  const response = await fetch(url.toString());
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  const jsonEnd = text.lastIndexOf("}");
  if (jsonEnd === -1) throw new Error("Response contained no JSON object");
  return JSON.parse(text.slice(0, jsonEnd + 1));
}

const server = new Server(
  { name: "validea-guru-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_guru_scores_history",
      description:
        "Retrieve the historical Validea guru strategy scores for a given stock ticker. " +
        "Returns daily, weekly, or monthly scores (0–100) for up to 22 guru strategies " +
        "over a specified date range (max 5 years per request). " +
        "Scores of 80+ indicate 'some interest'; scores of 90+ indicate 'strong interest'.",
      inputSchema: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "Stock ticker symbol (e.g. AAPL, MSFT, TSLA)",
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
        required: ["ticker"],
      },
    },
    {
      name: "screen_guru_scores",
      description:
        "Screen all stocks in the Validea database by guru strategy score thresholds. " +
        "Use this to answer questions like 'which stocks score over 80 on Warren Buffett?', " +
        "'find stocks that pass both Peter Lynch and Benjamin Graham', or " +
        "'show me the top stocks by Validea Index'. " +
        "Returns matching tickers with all their scores and summary metrics. " +
        "Defaults to the most recent available date. " +
        "Summary metrics returned per stock: " +
        "totalGurus = number of strategies where the stock scores 80+ (some interest); " +
        "totalGurusSI = number of strategies where the stock scores 90+ (strong interest only); " +
        "valideaIndex = a composite ranking score that weights strategies by historical performance — higher is better; " +
        "growthIndex = composite score across growth-oriented strategies; " +
        "valueIndex = composite score across value-oriented strategies; " +
        "fundamentalGrade = overall fundamental quality grade; " +
        "top5Gurus = score based on the top 5 best-performing guru strategies.",
      inputSchema: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description:
              "Score filters keyed by strategy name. Each value can have 'min' and/or 'max'. " +
              "Example: { \"warrenbuffett\": { \"min\": 80 }, \"peterlynch\": { \"min\": 80 } }",
            additionalProperties: {
              type: "object",
              properties: {
                min: { type: "integer", minimum: 0, maximum: 100 },
                max: { type: "integer", minimum: 0, maximum: 100 },
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
              "Column to sort results by descending. Use a strategy key (e.g. 'warrenbuffett') " +
              "or a summary metric: totalgurusnew, valideaindexnew, growthindex, valueindex, " +
              "fundamentalgrade, top5gurus. Default: totalgurusnew.",
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

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
        filters:  args?.filters,
        date:     args?.date,
        sort_by:  args?.sort_by,
        limit:    args?.limit,
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

  if (name === "get_guru_scores_history") {
    if (!args || !args.ticker) {
      return {
        isError: true,
        content: [{ type: "text", text: "Error: ticker is required." }],
      };
    }

    try {
      const data = await fetchGuruHistory({
        ticker:    args.ticker,
        startdate: args.startdate,
        enddate:   args.enddate,
        frequency: args.frequency,
        limit:     args.limit,
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
});

if (process.env.PORT) {
  // Remote mode: HTTP server with SSE transport (Azure App Service, etc.)
  const PORT = parseInt(process.env.PORT, 10);
  const sessions = new Map(); // sessionId -> SSEServerTransport

  const httpServer = http.createServer(async (req, res) => {
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
      await server.connect(transport);

    } else if (req.method === "POST" && url.pathname === "/message") {
      const sessionId = url.searchParams.get("sessionId");
      const transport = sessions.get(sessionId);
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Session not found");
      }

    } else if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "validea-guru-mcp" }));

    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });

  httpServer.listen(PORT, () => {
    console.error(`Validea Guru MCP server listening on port ${PORT}`);
  });

} else {
  // Local mode: stdio transport (for Claude Desktop direct use)
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

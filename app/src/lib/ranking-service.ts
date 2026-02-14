import Groq from "groq-sdk";
import { Lead, AIRankingResponse } from "./types";
import { PERSONA_SPEC, classifyCompanySize } from "./persona";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Ranks a single lead against the persona spec using the Groq AI API.
 * Returns the relevance score (0-100), relevance flag, and reasoning.
 */
export async function rankLead(lead: Lead): Promise<{
  result: AIRankingResponse;
  tokensUsed: number;
}> {
  const companySize = classifyCompanySize(lead.account_employee_range);

  const prompt = `You are an expert B2B sales lead qualification analyst for Throxy, an AI-powered sales company.

Given the following persona specification and lead information, evaluate how well this lead matches the ideal customer persona.

${PERSONA_SPEC}

## Lead to Evaluate
- **Name:** ${lead.lead_first_name} ${lead.lead_last_name}
- **Job Title:** ${lead.lead_job_title || "Unknown"}
- **Company:** ${lead.account_name}
- **Company Domain:** ${lead.account_domain}
- **Employee Range:** ${lead.account_employee_range || "Unknown"}
- **Company Size Classification:** ${companySize}
- **Industry:** ${lead.account_industry || "Unknown"}

## Instructions
Evaluate this lead and respond with ONLY a valid JSON object (no markdown, no code blocks) with these fields:

{
  "relevance_score": <number 0-100>,
  "is_relevant": <boolean>,
  "reasoning": "<2-3 sentence explanation of why this lead is or isn't a good fit>",
  "department_fit": "<one of: excellent, good, moderate, poor, disqualified>",
  "seniority_fit": "<one of: excellent, good, moderate, poor, disqualified>"
}

Key evaluation criteria:
1. Is the lead's job title/role aligned with Throxy's target personas for this company size?
2. Is the department relevant (Sales, Sales Development, Revenue Ops, BD, GTM)?
3. Is the seniority level appropriate for the company size?
4. Should this lead be excluded based on hard/soft exclusion criteria?
5. Does the company/industry suggest they could be a Throxy customer?

If the lead falls under hard exclusions (HR, Finance, Engineering, Legal, etc.) or has a clearly irrelevant role, set is_relevant to false and relevance_score below 20.
If the lead is a strong match, set relevance_score above 70.
A lead with no job title or very unclear information should score around 10-30.`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a lead qualification AI. Always respond with valid JSON only. No markdown formatting, no code blocks, just the raw JSON object.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || "";
  const tokensUsed = response.usage?.total_tokens || 0;

  try {
    // Clean any potential markdown formatting
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const result: AIRankingResponse = JSON.parse(cleaned);
    return { result, tokensUsed };
  } catch {
    // Fallback if JSON parsing fails
    return {
      result: {
        relevance_score: 0,
        is_relevant: false,
        reasoning: `Failed to parse AI response: ${content.substring(0, 100)}`,
        department_fit: "poor",
        seniority_fit: "poor",
      },
      tokensUsed,
    };
  }
}

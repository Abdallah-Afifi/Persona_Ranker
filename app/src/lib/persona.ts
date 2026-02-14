/**
 * Persona specification for Throxy's ideal lead profile.
 * This is used as context for the AI ranking system.
 */
export const PERSONA_SPEC = `
# Throxy Ideal Lead Profile

## Overview
Throxy's ideal customers are B2B companies that sell into complex verticals—manufacturing, education, and healthcare. The ideal leads are individuals directly accountable for pipeline generation and operationally involved in outbound execution. The right buyer changes dramatically based on company size.

## Lead Targeting by Company Size

### Startups (1-50 employees)
Primary Targets (in priority order):
1. Founder / Co-Founder (5/5)
2. CEO / President (5/5)
3. Owner / Co-Owner (5/5)
4. Managing Director (4/5)
5. Head of Sales (4/5)

### SMB (51-200 employees)
Primary Targets:
1. VP of Sales (5/5)
2. Head of Sales (5/5)
3. Sales Director (5/5)
4. Director of Sales Development (5/5)
5. CRO (Chief Revenue Officer) (4/5)
6. Head of Revenue Operations (4/5)
7. VP of Growth (4/5)

### Mid-Market (201-1,000 employees)
Primary Targets:
1. VP of Sales Development (5/5)
2. VP of Sales (5/5)
3. Head of Sales Development (5/5)
4. Director of Sales Development (5/5)
5. CRO (Chief Revenue Officer) (4/5)
6. VP of Revenue Operations (4/5)
7. VP of GTM (4/5)
Champions: Sales Managers, BDR Managers, RevOps Managers

### Enterprise (1,000+ employees)
Primary Targets:
1. VP of Sales Development (5/5)
2. VP of Inside Sales (5/5)
3. Head of Sales Development (5/5)
4. CRO (Chief Revenue Officer) (4/5)
5. VP of Revenue Operations (4/5)
6. Director of Sales Development (4/5)
7. VP of Field Sales (4/5)
Champions: BDR Managers, Directors of Sales Operations, RevOps Managers

## Department Priority
1. Sales Development (5/5) - Core function Throxy supports
2. Sales (5/5) - Owns quota, cares about pipeline
3. Revenue Operations (4/5) - Controls process and tooling
4. Business Development (4/5) - Often overlaps with sales dev
5. GTM / Growth (4/5) - Strategic view of sales motion
6. Executive (5/5 at startups → 1/5 at enterprise) - Only relevant at startups

## Seniority Relevance Matrix
| Seniority Level | Startup | SMB | Mid-Market | Enterprise |
|-----------------|---------|-----|------------|------------|
| Founder / Owner | 5/5 | 3/5 | 1/5 | 0/5 |
| C-Level | 5/5 | 3/5 | 2/5 | 1/5 |
| Vice President | 3/5 | 5/5 | 5/5 | 5/5 |
| Director | 2/5 | 4/5 | 5/5 | 4/5 |
| Manager | 1/5 | 2/5 | 3/5 | 3/5 |
| Individual Contributor | 0/5 | 0/5 | 1/5 | 1/5 |

## Who NOT to Contact

### Hard Exclusions
- CEO / President (Mid-Market & Enterprise) - Too far removed
- CFO / Finance - Wrong department
- CTO / Engineering - No relevance to sales
- HR / Legal / Compliance - Will slow deals or ignore outreach
- Customer Success - Post-sale focus
- Product Management - Different function entirely

### Soft Exclusions
- BDRs / SDRs - Not decision-makers
- Account Executives - Closers, not outbound owners
- CMO / VP Marketing - Rarely owns outbound directly
- Board Members / Advisors - Too removed from operations

## Industry Considerations
Throxy's ideal customers sell into manufacturing, education, and healthcare. Ideal customers include:
- SaaS companies selling to hospitals, school districts, or manufacturers
- Professional services firms targeting traditional industries
- B2B technology vendors with complex enterprise-style sales cycles
- Any company doing outbound into buyers who are harder to reach

## Negative Signals (Deprioritize)
- Sells to SMB or consumers (B2C)
- Product-led growth (PLG) company
- Large, established SDR team (20+)
- Company in layoffs or cost-cutting mode
- Lead has "Advisor" or "Consultant" in title (not employed, no buying power)
`;

/**
 * Classifies company size from employee range string.
 */
export function classifyCompanySize(
  employeeRange: string
): "startup" | "smb" | "mid-market" | "enterprise" | "unknown" {
  if (!employeeRange) return "unknown";

  const range = employeeRange.toLowerCase().trim();

  if (
    range.includes("1-10") ||
    range.includes("2-10") ||
    range.includes("11-50") ||
    range.includes("1-50")
  ) {
    return "startup";
  }
  if (range.includes("51-200")) {
    return "smb";
  }
  if (
    range.includes("201-500") ||
    range.includes("501-1000") ||
    range.includes("201-1000")
  ) {
    return "mid-market";
  }
  if (
    range.includes("1001") ||
    range.includes("5001") ||
    range.includes("10001") ||
    range.includes("1000+") ||
    range.includes("5000+") ||
    range.includes("10000+")
  ) {
    return "enterprise";
  }

  return "unknown";
}

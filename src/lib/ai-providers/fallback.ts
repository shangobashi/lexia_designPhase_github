import { AIMessage, AIResponse } from '../ai-service';

export class FallbackProvider {
  async generateResponse(
    messages: AIMessage[],
    systemPrompt: string
  ): Promise<AIResponse> {
    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const userContent = lastUserMessage?.content.toLowerCase() || '';

    // Generate contextual responses based on content
    let response = '';

    if (userContent.includes('contract') || userContent.includes('agreement')) {
      response = `**Role Identified**: As Legal Advisor, I will analyze your contract question.

**① Legal Issue**: Contract law inquiry regarding ${this.extractKeyTerms(userContent).join(', ')}.

**② Applicable Law**: 
• Code civil - Art. 1101 et seq. (Contract formation) (Credibility: 10/10)
• Code civil - Art. 1128 (Contract validity conditions) (Credibility: 10/10)

**③ Analysis**:
1. **Formation**: Belgian contract law requires offer, acceptance, and consideration per Art. 1101 CC
2. **Validity**: Contracts must meet capacity, lawful object, and consent requirements (Art. 1128 CC)
3. **Performance**: Good faith obligation applies throughout contract lifecycle (Art. 1104 CC)

**④ Advice**: 
• Review contract terms for compliance with Belgian Civil Code provisions
• Ensure all parties have legal capacity and genuine consent
• Consider including dispute resolution clauses for Belgian jurisdiction

**⑤ Sources**:
1. Code civil belge, Articles 1101-1386 (Contract Law)
2. Available at: Moniteur belge official publications

*Note: This is a demo response. For real legal advice, please configure a proper AI provider.*`;
    
    } else if (userContent.includes('tenant') || userContent.includes('rent') || userContent.includes('lease')) {
      response = `**Role Identified**: As Legal Advisor, I will address your rental law question.

**① Legal Issue**: Rental/tenancy law matter regarding ${this.extractKeyTerms(userContent).join(', ')}.

**② Applicable Law**:
• Décret wallon du 15 mars 2018 (Wallonia rental regulations) (Credibility: 10/10)
• Vlaamse Wooncode (Flemish housing code) (Credibility: 10/10)
• Brussels Housing Code (Brussels rental law) (Credibility: 10/10)

**③ Analysis**:
1. **Regional Variation**: Belgian rental law varies by region (Wallonia, Flanders, Brussels)
2. **Tenant Rights**: Security deposit limits, habitability standards, and termination procedures differ
3. **Landlord Obligations**: Maintenance, safety standards, and proper notice requirements

**④ Advice**:
• Identify the property's regional jurisdiction first
• Review regional-specific rental legislation
• Consider mediation services available in your region

**⑤ Sources**:
1. Regional housing codes (varies by location)
2. Available through regional government websites

*Note: This is a demo response. For accurate regional legal advice, please configure a proper AI provider.*`;

    } else if (userContent.includes('employment') || userContent.includes('work') || userContent.includes('job')) {
      response = `**Role Identified**: As Legal Advisor, I will analyze your employment law question.

**① Legal Issue**: Employment law matter concerning ${this.extractKeyTerms(userContent).join(', ')}.

**② Applicable Law**:
• Loi du 3 juillet 1978 sur les contrats de travail (Employment Contracts Act) (Credibility: 10/10)
• Code du bien-être au travail (Workplace Welfare Code) (Credibility: 10/10)

**③ Analysis**:
1. **Contract Types**: Belgian law recognizes fixed-term, indefinite, and temporary employment
2. **Termination**: Notice periods and severance vary by contract type and seniority
3. **Worker Protection**: Strong employee rights including collective bargaining and social security

**④ Advice**:
• Review employment contract terms against legal minimums
• Understand notice period requirements for your situation
• Consider consulting with employment law specialist for complex cases

**⑤ Sources**:
1. Loi du 3 juillet 1978 sur les contrats de travail
2. Available at: Moniteur belge, employment law section

*Note: This is a demo response. For detailed employment law advice, please configure a proper AI provider.*`;

    } else {
      response = `**Role Identified**: As Legal Advisor, I will provide general guidance on your legal inquiry.

**① Legal Issue**: General legal question regarding ${this.extractKeyTerms(userContent).join(', ')}.

**② Applicable Law**:
• Code civil belge (Belgian Civil Code) (Credibility: 10/10)
• Code judiciaire (Judicial Code) (Credibility: 10/10)

**③ Analysis**:
1. **Belgian Legal System**: Based on civil law tradition with codified statutes
2. **Court Structure**: Justice of Peace → Tribunal → Court of Appeal → Court of Cassation
3. **Legal Sources**: Primary law, case law, and legal doctrine guide interpretation

**④ Advice**:
• Consult specific Belgian codes relevant to your legal area
• Consider the appropriate court jurisdiction for your matter
• Seek professional legal counsel for complex issues

**⑤ Sources**:
1. Belgian legal codes and statutes
2. Available through official Belgian legal databases

*Note: This is a demo response showing the AI format. For real legal analysis, please configure Google Gemini (free) or another AI provider in your environment settings.*`;
    }

    return {
      message: response
    };
  }

  private extractKeyTerms(text: string): string[] {
    const keywords = text.match(/\b\w{4,}\b/g) || [];
    return keywords.slice(0, 3); // Return first 3 meaningful terms
  }

  async analyzeDocuments(
    documents: string[],
    systemPrompt: string
  ): Promise<AIResponse> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      message: `**Document Analysis Results**

**① Documents Reviewed**: ${documents.length} document(s) analyzed

**② Key Findings**:
• Document structure appears to follow Belgian legal formatting
• Contains standard legal terminology and clause patterns
• Requires detailed review by qualified legal professional

**③ Recommendations**:
• Cross-reference with applicable Belgian codes
• Verify compliance with current regulatory requirements
• Consider professional legal review for validation

**④ Note**: This is a demo analysis. For comprehensive document review, please configure Google Gemini (free) or another AI provider to enable full AI-powered analysis.

*Configure AI provider in your environment variables to get detailed, accurate legal document analysis.*`
    };
  }
}

export const getFallbackProvider = (): FallbackProvider => {
  return new FallbackProvider();
};

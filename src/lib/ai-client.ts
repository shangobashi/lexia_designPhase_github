// Real AI client that connects to actual AI APIs
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIResponse {
  message: string;
  provider: string;
  tokenCount?: number;
}

class AIClient {
  private geminiApiKey: string;
  private groqApiKey: string;
  private huggingFaceApiKey: string;
  private mistralApiKey: string;

  constructor() {
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    this.groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
    this.huggingFaceApiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    this.mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;
    
    if (!this.geminiApiKey || this.geminiApiKey === 'your-gemini-api-key') {
      console.warn('⚠️ Gemini API key not configured');
    }
    
    if (!this.groqApiKey || this.groqApiKey === 'your-groq-api-key') {
      console.warn('⚠️ Groq API key not configured');
    }
    
    if (!this.huggingFaceApiKey || this.huggingFaceApiKey === 'your-huggingface-api-key') {
      console.warn('⚠️ HuggingFace API key not configured');
    }
    
    if (!this.mistralApiKey || this.mistralApiKey === 'your-mistral-api-key') {
      console.warn('⚠️ Mistral API key not configured');
    }
  }

  async chatWithGemini(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.geminiApiKey || this.geminiApiKey === 'your-gemini-api-key') {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    try {
      const systemPrompt = "Tu es un assistant juridique français expert. Réponds de manière professionnelle et précise aux questions juridiques en français. Cite les articles de loi pertinents quand c'est possible.";
      
      const formattedMessages = messages.map(msg => ({
        parts: [{ text: msg.content }]
      }));

      const prompt = [
        { parts: [{ text: systemPrompt }] },
        ...formattedMessages
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: prompt,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]) {
        throw new Error('No response from Gemini API');
      }

      const content = data.candidates[0].content.parts[0].text;
      
      return {
        message: content,
        provider: 'gemini',
        tokenCount: data.usageMetadata?.totalTokenCount || 0
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async chatWithGroq(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.groqApiKey || this.groqApiKey === 'your-groq-api-key') {
      throw new Error('Groq API key not configured. Please add VITE_GROQ_API_KEY to your .env file.');
    }

    try {
      const systemMessage = {
        role: 'system' as const,
        content: "Tu es un assistant juridique français expert. Réponds de manière professionnelle et précise aux questions juridiques en français. Cite les articles de loi pertinents quand c'est possible."
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('No response from Groq API');
      }

      return {
        message: data.choices[0].message.content,
        provider: 'groq',
        tokenCount: data.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  async chatWithHuggingFace(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.huggingFaceApiKey || this.huggingFaceApiKey === 'your-huggingface-api-key') {
      throw new Error('HuggingFace API key not configured. Please add VITE_HUGGINGFACE_API_KEY to your .env file.');
    }

    try {
      const systemPrompt = "Tu es un assistant juridique français expert. Réponds de manière professionnelle et précise aux questions juridiques en français. Cite les articles de loi pertinents quand c'est possible.";
      
      // Format messages for HuggingFace API
      const formattedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: formattedMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
          parameters: {
            max_new_tokens: 1024,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data || !data[0]?.generated_text) {
        throw new Error('No response from HuggingFace API');
      }

      return {
        message: data[0].generated_text,
        provider: 'huggingface',
        tokenCount: data[0].generated_text.split(' ').length // Rough estimate
      };
    } catch (error) {
      console.error('HuggingFace API error:', error);
      throw error;
    }
  }

  async chatWithMistral(messages: ChatMessage[]): Promise<AIResponse> {
    if (!this.mistralApiKey || this.mistralApiKey === 'your-mistral-api-key') {
      throw new Error('Mistral API key not configured. Please add VITE_MISTRAL_API_KEY to your .env file.');
    }

    try {
      const systemMessage = {
        role: 'system' as const,
        content: "Tu es un assistant juridique français expert. Réponds de manière professionnelle et précise aux questions juridiques en français. Cite les articles de loi pertinents quand c'est possible."
      };

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.mistralApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-tiny',
          messages: [systemMessage, ...messages],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('No response from Mistral API');
      }

      return {
        message: data.choices[0].message.content,
        provider: 'mistral',
        tokenCount: data.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error('Mistral API error:', error);
      throw error;
    }
  }

  async chatWithFallback(messages: ChatMessage[]): Promise<AIResponse> {
    // Fallback demo responses for when no AI providers are configured
    const lastMessage = messages[messages.length - 1];
    const userQuestion = lastMessage?.content || '';
    
    // Simple demo responses based on keywords
    let response = '';
    
    if (userQuestion.toLowerCase().includes('contrat') || userQuestion.toLowerCase().includes('contract')) {
      response = `En droit belge, un contrat est un accord de volontés entre deux ou plusieurs parties qui crée des obligations juridiques. Pour qu'un contrat soit valide, il doit respecter certaines conditions :

1. **Capacité juridique** des parties
2. **Consentement libre et éclairé** 
3. **Objet licite et déterminé**
4. **Cause licite**

Si vous avez des questions spécifiques sur votre contrat, je recommande de consulter un avocat pour une analyse détaillée de votre situation.

*Note : Ceci est une réponse de démonstration. Pour des conseils juridiques personnalisés, veuillez configurer une clé API IA ou consulter un professionnel du droit.*`;
    } else if (userQuestion.toLowerCase().includes('location') || userQuestion.toLowerCase().includes('bail')) {
      response = `En Belgique, les baux d'habitation sont régis par le Code civil et des décrets régionaux. Voici les points clés :

**Durée :** Minimum 3 ans (sauf exceptions)
**Dépôt de garantie :** Maximum 2 mois de loyer
**État des lieux :** Obligatoire à l'entrée et à la sortie
**Préavis :** 3 mois pour le locataire, conditions spécifiques pour le propriétaire

Chaque région (Flandre, Wallonie, Bruxelles) a ses propres spécificités législatives.

*Note : Ceci est une réponse de démonstration. Pour des conseils juridiques personnalisés, veuillez configurer une clé API IA ou consulter un professionnel du droit.*`;
    } else if (userQuestion.toLowerCase().includes('divorce') || userQuestion.toLowerCase().includes('séparation')) {
      response = `En droit belge, il existe plusieurs types de divorce :

1. **Divorce par consentement mutuel** - Le plus rapide et économique
2. **Divorce pour cause déterminée** - En cas de faute grave
3. **Divorce pour désunion irrémédiable** - Après séparation de fait

**Procédure :** Intervention d'un avocat obligatoire, passage devant le tribunal de la famille.

**Effets :** Partage des biens, garde des enfants, pension alimentaire possible.

*Note : Ceci est une réponse de démonstration. Pour des conseils juridiques personnalisés, veuillez configurer une clé API IA ou consulter un professionnel du droit.*`;
    } else {
      response = `Merci pour votre question sur le droit belge. En mode démonstration, je peux vous fournir des informations générales sur :

• **Droit des contrats** (contrats de vente, de travail, etc.)
• **Droit immobilier** (baux, achats, ventes)
• **Droit de la famille** (divorce, succession, filiation)
• **Droit des sociétés** (création d'entreprise, statuts)
• **Droit du travail** (contrats, licenciements, droits des employés)

Pourriez-vous reformuler votre question en mentionnant l'un de ces domaines juridiques ?

*Note : Ceci est une réponse de démonstration. Pour des conseils juridiques personnalisés et des réponses IA avancées, veuillez configurer une clé API IA ou consulter un professionnel du droit.*`;
    }

    // Simulate response delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      message: response,
      provider: 'demo',
      tokenCount: response.split(' ').length
    };
  }

  async chat(messages: ChatMessage[], preferredProvider: 'gemini' | 'groq' | 'huggingface' | 'mistral' | 'fallback' = 'gemini'): Promise<AIResponse> {
    // If fallback is specifically requested, use demo mode
    if (preferredProvider === 'fallback') {
      return this.chatWithFallback(messages);
    }

    const allProviders = ['gemini', 'groq', 'huggingface', 'mistral'];
    const providers = [preferredProvider, ...allProviders.filter(p => p !== preferredProvider)];
    
    for (const provider of providers) {
      try {
        if (provider === 'gemini') {
          return await this.chatWithGemini(messages);
        } else if (provider === 'groq') {
          return await this.chatWithGroq(messages);
        } else if (provider === 'huggingface') {
          return await this.chatWithHuggingFace(messages);
        } else if (provider === 'mistral') {
          return await this.chatWithMistral(messages);
        }
      } catch (error) {
        console.warn(`${provider} failed, trying next provider:`, error);
        continue;
      }
    }
    
    // If all providers fail, use fallback demo mode
    console.warn('All AI providers failed, falling back to demo mode');
    return this.chatWithFallback(messages);
  }
}

export const aiClient = new AIClient();
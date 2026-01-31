// Setup verification utility to check if all services are properly configured

export interface SetupStatus {
  supabase: {
    configured: boolean;
    error?: string;
  };
  ai: {
    gemini: boolean;
    groq: boolean;
    anyConfigured: boolean;
  };
  overall: boolean;
}

export async function checkSetup(): Promise<SetupStatus> {
  const status: SetupStatus = {
    supabase: { configured: false },
    ai: { gemini: false, groq: false, anyConfigured: false },
    overall: false
  };

  // Check Supabase configuration
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || supabaseUrl === 'your-supabase-url' || 
      !supabaseKey || supabaseKey === 'your-supabase-anon-key') {
    status.supabase.configured = false;
    status.supabase.error = 'Supabase credentials not configured';
  } else {
    try {
      // Test Supabase connection
      const { supabase } = await import('./supabase');
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is fine for setup
        status.supabase.configured = false;
        status.supabase.error = `Supabase connection failed: ${error.message}`;
      } else {
        status.supabase.configured = true;
      }
    } catch (error) {
      status.supabase.configured = false;
      status.supabase.error = `Supabase setup error: ${error}`;
    }
  }

  // Check AI configuration
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  
  status.ai.gemini = !!(geminiKey && geminiKey !== 'your-gemini-api-key');
  status.ai.groq = !!(groqKey && groqKey !== 'your-groq-api-key');
  status.ai.anyConfigured = status.ai.gemini || status.ai.groq;

  // Overall status
  status.overall = status.supabase.configured && status.ai.anyConfigured;

  return status;
}

export function getSetupInstructions(status: SetupStatus): string[] {
  const instructions: string[] = [];

  if (!status.supabase.configured) {
    instructions.push(
      '🔧 Supabase Setup Required:',
      '1. Go to https://app.supabase.com',
      '2. Create a new project',
      '3. Go to Settings > API',
      '4. Copy Project URL and Anon Key to .env file',
      '5. Run the database migration in SQL Editor',
      ''
    );
  }

  if (!status.ai.anyConfigured) {
    instructions.push(
      '🤖 AI API Setup Required:',
      '1. Get Gemini API key from https://makersuite.google.com/app/apikey',
      '2. OR get Groq API key from https://console.groq.com/keys',
      '3. Add the key(s) to your .env file',
      ''
    );
  }

  if (status.overall) {
    instructions.push('✅ Setup complete! Your Kingsley instance is ready to use.');
  } else {
    instructions.push('📖 See SETUP_GUIDE.md for detailed instructions.');
  }

  return instructions;
}
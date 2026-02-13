# Kingsley - Belgian Legal Assistant

Kingsley is a sophisticated web-based legal assistant platform specifically designed for Belgian law practitioners. It combines advanced AI capabilities with an intuitive user interface to streamline legal research, case management, and document analysis.

## 🌟 Features

### AI-Powered Legal Assistance
- **Dual AI Provider Support**
  - OpenAI (GPT-4 Turbo) for premium service
  - HuggingFace (Mistral-7B) as a free alternative
- **Specialized Legal Knowledge**
  - Focus on Belgian law and legal system
  - Built-in understanding of legal terminology and procedures
  - Real-time legal research assistance

### Case Management
- Create and manage legal cases
- Document upload and organization
- Case status tracking
- Conversation history
- File analysis and summarization

### Document Handling
- Support for multiple file formats:
  - PDF documents
  - Word documents (DOC, DOCX)
  - Text files (TXT)
  - Images (JPG, PNG)
- Automatic document analysis
- File size limit: 10MB per file

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shangobashi/Kingsley.git
cd Kingsley
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

### Overnight local runtime (night shift)

```bash
npm run night:start
```

This launches:

- Local development server on `http://localhost:5173`
- A guarded orchestrator loop that runs background build-health checks and keeps runtime state under `.night/`
- A Codex self-prompt worker that auto-resumes its own session and keeps iterating improvements overnight

To watch live Night execution in your terminal:

```bash
npm run night:watch
```

This shows:

- Process health (`orchestrator`, `local-dev`, `selfprompt`)
- Current orchestrator iteration/failure status
- Recent task events from `.night/logs/sessions.jsonl`
- Recent Codex loop signals from `.night/logs/codex-selfprompt.log`

Night status is rendered in the dashboard "Night runtime" card. By default it reads `public/night-status.json`, and when `ENABLE_NIGHT_STATUS_API=true` on the backend it also uses `/api/night/status` for lane-level runtime health (`message`, `cron`, `selfprompt`).

Audit exports in the dashboard can optionally include backend attestation signatures (Ed25519) when `AUDIT_MANIFEST_SIGNING_ENABLED=true` and an `AUDIT_MANIFEST_SIGNING_PRIVATE_KEY_PEM` is configured on the backend. To expose verification details in-app (key id/fingerprint/public key download), enable `AUDIT_MANIFEST_PUBLIC_KEY_EXPOSURE_ENABLED=true` and the frontend will read `/api/audit/signing-status`. For server-side pass/fail verification receipts of manifest bundles, enable `AUDIT_MANIFEST_VERIFICATION_API_ENABLED=true` and use `/api/audit/verify-manifest` (also available through the dashboard Signature attestation panel). You can enforce trusted signer pinning with `AUDIT_MANIFEST_TRUST_POLICY_MODE=enforced` plus `AUDIT_MANIFEST_TRUSTED_KEY_IDS` and/or `AUDIT_MANIFEST_TRUSTED_PUBLIC_KEY_SHA256S`; for rotation windows, configure `AUDIT_MANIFEST_TRUSTED_SIGNERS_JSON` entries with `not_before`/`not_after`. Runtime updates can be managed through authenticated `GET/PUT /api/audit/trust-registry`, trust-admin role assignment via `GET/POST /api/audit/trust-admins`, snapshot/rollback controls via `GET /api/audit/trust-registry/snapshots` and `POST /api/audit/trust-registry/rollback`, paginated history via `GET /api/audit/trust-registry/history?limit=&offset=&retention_days=`, and retention trim via `POST /api/audit/trust-registry/history/trim` (when `AUDIT_TRUST_REGISTRY_MANAGEMENT_ENABLED=true`) with role gating that prefers persisted `profiles.is_trust_admin` claims and falls back to `AUDIT_TRUST_REGISTRY_ADMIN_USER_IDS` / `AUDIT_TRUST_REGISTRY_ADMIN_EMAILS` only when role data is unavailable; changes are logged to `.night/logs/audit-trust-registry-events.jsonl`.

For a dedicated external monitor (outside the app UI), open:

```text
http://localhost:5173/night-monitor.html
```

This page reads `public/night-monitor.json` (written by the `night-publisher` process) and shows:

- heartbeat age vs configured loop interval
- process health (`orchestrator`, `local-dev`, `selfprompt`, `publisher`)
- recent session events and Codex loop signals
- git branch + changed-file count snapshot

For a one-shot snapshot (useful for checks in CI/terminal history):

```bash
npm run night:watch:once
```

To stop all night-shift processes:

```bash
npm run night:stop
```

## 🛠️ Tech Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: 
  - Custom components
  - Radix UI primitives
- **State Management**: React Hooks
- **API Integration**:
  - OpenAI API
  - HuggingFace API

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ai/             # AI-related components
│   ├── cases/          # Case management components
│   ├── chat/           # Chat interface components
│   └── ui/             # Reusable UI components
├── lib/                # Core functionality
│   ├── ai-service.ts   # AI service integration
│   ├── config.ts       # Application configuration
│   └── utils.ts        # Utility functions
├── pages/              # Application pages
└── types/              # TypeScript type definitions
```

## 🔒 Security

- API keys are stored securely in environment variables
- Client-side encryption for sensitive data
- Secure file handling and validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for their powerful GPT models
- HuggingFace for providing accessible AI models
- The Belgian legal community for their insights and feedback

## 📞 Support

For support, please email support@kingsley.com or open an issue in the GitHub repository.

---

Made with ❤️ by the Kingsley Team

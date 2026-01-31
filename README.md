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

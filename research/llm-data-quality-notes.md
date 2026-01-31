# LLM Data Quality Notes
*Captured 2026-01-29 ~3AM MST*

## Core Principle
Data quality > model architecture. Good data is the fuel, everything else is engine tuning.

---

## 1. Source High-Quality Data
- **Domain-specific docs & manuals**: PDFs, websites, knowledge bases
- **Expert-written content**: Whitepapers, research articles, industry blogs
- **Conversational logs**: Anonymized transcripts for real talk patterns
- **Open datasets**: Kaggle, Hugging Face Datasets, academic corpora
- **Public APIs**: Structured info (product specs, FAQs)

## 2. Clean & Preprocess
- Remove duplicates, fix typos, standardize formatting
- Break long docs into meaningful chunks or Q&A pairs
- Annotate/label data (intents, entities, sentiment)
- Filter out irrelevant or low-quality content

## 3. Structure for Training
- Format as pairs: Input → Output, Question → Answer, Prompt → Completion
- Use JSON, CSV, or pipeline-specific formats
- Include simple AND complex examples (basics + edge cases)

## 4. Add Reasoning & Context
- Multi-step reasoning examples with explanations
- Dialogue context for conversation tracking
- Chain-of-thought prompts for logical flows

## 5. Iterate & Expand
- Start small, train baseline, then expand
- Active learning: identify weak spots from mistakes, add targeted examples
- Keep data fresh and updated

---

## Application to Opie
- "Training data" = MEMORY.md, daily notes, chat logs, facts/
- Quality control = accurate extraction, good structure
- Domain-specific = Omnia, landscape lighting, Wes's preferences
- Self-evolution systems = continuous fine-tuning from conversations

---

## Implementation Steps

1. **Define Domain & Goals** — Primary focus guides data collection
2. **Source High-Quality Content** — Whitepapers, FAQs, chat logs, public datasets
3. **Clean & Format** — Organize into prompt → response or Q&A pairs
4. **Build Reasoning Examples** — Multi-step prompts for complex scenarios
5. **Set Up Training Pipeline** — Format to JSONL or pipeline-specific format

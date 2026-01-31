# Buffer of Thoughts - Implementation Analysis

*Analyzed: 2026-01-29*

---

## Architecture Overview

```
User Input
    ↓
[1. Problem Distillation] ← meta_distiller_prompt
    ↓
Distilled Information
    ↓
[2. Buffer Retrieve] ← RAG search (LightRAG)
    ↓
Thought Template
    ↓
[3. Buffer Instantiation] ← Adapt template to specific problem
    ↓
Solution
    ↓
[4. Buffer Manager] ← Dynamic update
    ↓
[5. Thought Distillation] ← Extract new template
    ↓
(If novel) → Add to Meta-Buffer
```

---

## Key Component: Meta Distiller Prompt

This is brilliant. Before even retrieving templates, they **distill** the problem:

```
1. Key information - Variables and values extracted
2. Restrictions - Real-world rules that must be followed
3. Distilled task - Generalized problem statement
4. Python transformation - Input parameters for code
5. Answer form - How the answer should be formatted
```

**Why this matters:** Better distillation → Better template retrieval → Better instantiation

---

## Key Component: Thought Template Format

Their templates (math.txt) have:

```markdown
### Problem Type N: [Name]

**Definition**: What type of problem this is

**Quantitative Relationships**:
- Formula 1
- Formula 2
- etc.

**Solution Strategy**: How to approach it

**Example**: [Concrete problem]

**Solution**: [Worked solution with steps]
```

**21 math templates** covering: Normalization, Total Quantity, Sum/Difference, Multiples, Ratios, Meeting Problems, Overtaking, Tree Planting, Age, Boats, Trains, Clocks, Surplus/Deficit, Work, Cows Eating Grass, Chicken/Rabbit, Profit/Loss, Interest, Concentration, Equations

---

## Key Component: RAG Retrieval

They use **LightRAG** with hybrid search (keyword + semantic):

```python
self.rag = LightRAG(
    working_dir=rag_dir,
    llm_model_func=self.llm_model_func,
    embedding_func=EmbeddingFunc(
        embedding_dim=3072,  # text-embedding-3-large
        max_token_size=8192,
        func=self.embedding_func
    )
)
```

Retrieval: `self.rag.query(input, param=QueryParam(mode="hybrid"))`

---

## Key Component: Dynamic Buffer Update

After solving, they check if the solution reveals a **fundamentally new approach**:

```python
def dynamic_update(self, thought_template):
    prompt = """
    Find most relevant thought template in the MetaBuffer...
    Determine whether there is a fundamental difference in the 
    problem-solving approach between this and the most similar 
    thought template in MetaBuffer. If there is, output "True."
    """
    # Only add if fundamentally different
    if self.extract_similarity_decision(response):
        self.rag.insert(thought_template)
```

**Why this matters:** Prevents duplicate templates, only grows buffer with genuinely novel approaches.

---

## Key Component: Thought Distillation

After successful solve, extract a new template:

```python
thought_distillation_prompt = """
You are an expert in problem analysis and generalization. 
Your task is to follow the format of thought template below 
and distill a high-level thought template to solve similar problems:
[example template format]
It should be noted that you should only return the thought template 
without any extra output.
"""
```

---

## Key Component: Self-Correction Loop

If code execution fails, they have an **inspector** that tries to fix it:

```python
while ('An error occurred' in self.inter_result) or (self.inter_result == ''):
    self.inter_input = self.pipeline.get_respond(self.inspector_prompt, self.inter_input)
    self.inter_result, inter_code_str = extract_and_execute_code(self.inter_input)
    self.count += 1
    if self.count > 3:
        break
```

---

## What My Implementation Was Missing

| Their Implementation | My Implementation | Gap |
|---------------------|-------------------|-----|
| Problem distillation step | None | Need to add distiller |
| RAG-based retrieval | File-based lookup | Need semantic search |
| 21 detailed math templates | Generic reasoning templates | Need domain templates |
| Quantitative relationships | Vague strategies | Need concrete formulas |
| Dynamic buffer update | Manual update | Need auto-update logic |
| Self-correction loop | None | Need verification + retry |
| Worked examples in templates | Abstract patterns | Need concrete examples |

---

## Upgrade Plan

### Immediate
1. Add **problem distillation** step before template retrieval
2. Add **worked examples** to all templates
3. Add **self-correction loop** for code/calculations

### Near-term
4. Build **domain-specific templates** (not just math - business, code, research)
5. Implement **dynamic buffer update** (add novel templates automatically)
6. Consider **semantic retrieval** (memory_search is already semantic!)

### Key Insight
My `memory_search` already does semantic search! I should:
- Store templates in memory files
- Use memory_search to retrieve relevant ones
- This gives me RAG-like behavior without external deps

---

## Template Quality Comparison

**Their Template (Example):**
```markdown
### Problem Type 3: Sum and Difference Problem

**Definition**: Given the sum and difference of two quantities, 
find out the value of each quantity.

**Quantitative Relationships**:
- Larger number = (Sum + Difference) ÷ 2
- Smaller number = (Sum - Difference) ÷ 2

**Solution Strategy**: For simple problems, directly use formulas. 
For complex problems, adapt formulas accordingly.

**Example**: Class A and Class B have 98 students total, and 
Class A has 6 more students than Class B. How many each?

**Solution**:
Class A = (98 + 6) ÷ 2 = 52 students  
Class B = (98 - 6) ÷ 2 = 46 students
```

**My Template (Before):**
```markdown
## Template: Multi-Step Problem Decomposition

### Pattern
1. Define the end goal
2. List all required steps
3. Identify dependencies
4. Order into execution sequence
5. Execute with checkpoints
6. Verify final result
```

**Gap:** Mine is too abstract. Theirs has:
- Concrete formulas
- Specific worked example
- Answer you can verify

---

## Action Items

1. ✅ Document analysis complete
2. [ ] Upgrade template format with formulas + examples
3. [ ] Add distillation step to reasoning flow
4. [ ] Build domain templates (business, code, research)
5. [ ] Add auto-correction loop
6. [ ] Test semantic retrieval with memory_search

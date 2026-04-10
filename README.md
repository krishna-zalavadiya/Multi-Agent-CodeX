# 🚀 Multi-Agent AI Code Reviewer  

An advanced AI-powered code review system that leverages a multi-agent architecture to perform deep analysis across bugs, security vulnerabilities, and performance optimization.  

Built using LangGraph and CrewAI, this project demonstrates production-grade design patterns in AI systems, backend engineering, and full-stack development.

---

## 🧠 Why This Project Matters  

### Traditional code review tools are:
- ❌ Single-dimensional  
- ❌ Shallow in analysis  
- ❌ Not context-aware  

### This project solves that by introducing:
- ✅ Parallel AI agents with specialized expertise  
- ✅ Structured, explainable outputs  
- ✅ Scalable orchestration pipeline  

---

## 🏗️ System Architecture  
<img width="286" height="218" alt="image" src="https://github.com/user-attachments/assets/d5d2b0b7-a80e-4855-9b35-1e9adab4bbac" />

- Designed using stateful graph-based orchestration  
- Supports parallel execution of AI agents  
- Clean separation of concerns across system layers  

---

## 🤖 Core Features  

### 🔍 Multi-Agent Code Analysis  

**Bug Detection Agent**
- Logical errors  
- Null handling  
- Runtime issues  

**Security Agent**
- OWASP Top 10 vulnerabilities  
- Injection risks  
- Insecure patterns  

**Optimization Agent**
- Performance bottlenecks  
- Redundant logic  
- Algorithm improvements  

---

### ⚡ High-Performance Backend  
- Built with FastAPI for async APIs  
- Modular agent orchestration layer  
- Scalable architecture  

---

### 🎨 Interactive Frontend  
- Built with React  
- Monaco Editor integration (VS Code-like experience)  
- Clean UI for structured review visualization  

---

## 🧰 Tech Stack  

- **Model:** DeepSeek-Coder-2  
- **AI Orchestration:** LangGraph, CrewAI  
- **LLM Layer:** LangChain  
- **Backend:** FastAPI  
- **Frontend:** React  
- **Database:** PostgreSQL  

---

## ⚙️ Getting Started  

### 🔧 Setup  

```bash
Backend:
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
Frontend:
cd frontend
npm install
npm run dev
```
--- 

## 🚀 Future Enhancements

Add Celery + Redis for distributed task processing
Dockerize for production deployment
GitHub PR auto-review integration
Multi-language support (C++, Go, Rust)
Authentication & multi-user support

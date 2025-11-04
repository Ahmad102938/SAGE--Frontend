# Baseline Architecture (v1.0)

The **Sage system architecture** is organized into six cohesive layers, each handling a distinct part of the intelligent automation and interaction pipeline.

---

## 1. Interface Layer
> 💻 *User Interaction & Experience*

- **Tech Stack:** Next.js frontend  
- **Capabilities:** Voice input, real-time UI updates  
- **APIs:** GraphQL / REST endpoints for data and command exchange  

---

## 2. Gateway Layer
> 🚪 *Security, Authentication & Routing*

- **Core:** NestJS API Gateway  
- **Functions:**  
  - Authentication & authorization  
  - Task routing and dispatch  
  - Policy enforcement and operational guardrails  

---

## 3. Agent Layer
> 🧩 *Cognitive Orchestration*

- **Powered by:** `LangGraph.js`  
- **Agents:**  
  - **Planner Agent** – Task decomposition & scheduling  
  - **Device Interaction Agent** – Handles communication with connected devices  
  - **Persistence Agent** – Manages state and memory  
  - **Personalization Agent** – Learns and adapts to user preferences  

---

## 4. Tool Layer
> 🛠️ *Low-Level Functional Utilities*

- Disambiguation logic  
- Device Interaction interfaces  
- Conditional Code generation  
- Polling & background tasks  
- Personalization & user-context functions  

---

## 5. Data & Knowledge Layer
> 🧾 *State, Context, and Intelligence Storage*

- **Databases:**  
  - **World Graph DB** – Contextual and relational knowledge  
  - **Vector DB** – Embeddings & semantic search  
  - **Timeseries DB** – Temporal event tracking  
  - **Config DB** – System configuration and metadata  
- **Event Bus** for async communication across services  

---

## 6. Adapter Layer
> 🌐 *Integration Connectors*

- **Supported Platforms:**  
  - SmartThings  
  - Matter  
  - Home Assistant  
  - Hue  
  - Sonos  
  - External APIs (custom integrations)  

---

## ✅ Current Progress

**Status:**  
✔️ Completed — *Layer 1: Interface Layer*  

**Preview:**  
![Interface Layer Screenshot](https://github.com/user-attachments/assets/1b4df99a-ac98-41e6-834d-0e0b6bfb103b)

---

## Next Steps
- [ ] Implement Gateway Layer (NestJS API Gateway)  
- [ ] Integrate Planner Agent via LangGraph.js  
- [ ] Connect Data & Knowledge Layer (Vector DB + Event Bus)  
- [ ] Build smart adapters for IoT platforms  

this is baseline version for sage
Baseline Architecture (v1.0)
The architecture is divided into six layers: 1. Interface Layer: Next.js frontend, voice input, GraphQL/REST API. 2. Gateway Layer: NestJS API gateway, authentication, task routing, policy guardrails. 3. Agent Layer: Planner Agent, Device Interaction Agent, Persistence Agent, Personalization Agent (LangGraph.js). 4. Tool Layer: Disambiguation, Device Interaction, Condition Code Writing, Polling, Personalization. 5. Data & Knowledge Layer: World Graph DB, Vector DB, Timeseries DB, Config DB, Event Bus. 6. Adapter Layer: SmartThings, Matter, Home Assistant, Hue, Sonos, external APIs.

Current status complited the layer 1:- 
<img width="1416" height="827" alt="Screenshot 2025-11-05 at 12 23 16 AM" src="https://github.com/user-attachments/assets/1b4df99a-ac98-41e6-834d-0e0b6bfb103b" />

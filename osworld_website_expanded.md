# OSWorld Modern Website Design (Expanded)

## 1. Introduction
OSWorld stands as a groundbreaking scalable environment for evaluating multimodal agents in real computer ecosystems. Launched in 2024 and upgraded to *OSWorld-Verified* on 2025-07-28, it now features fixes for community-reported edge cases, AWS integration (slashing evaluation times to under an hour), and revised benchmarking data. This platform empowers researchers to test agents across open-ended tasks spanning operating systems, applications, and complex workflows.

## 2. Research Team & Affiliations
Led by researchers from The University of Hong Kong, Salesforce Research, Carnegie Mellon University, and the University of Waterloo, the OSWorld team includes: 
- Tianbao Xie, Danyang Zhang, Jixuan Chen, Xiaochuan Li, Siheng Zhao, Ruisheng Cao, Toh Jing Hua, Zhoujun Cheng, Dongchan Shin, Fangyu Lei, Yitao Liu, Yiheng Xu, Shuyan Zhou, Silvio Savarese, Caiming Xiong, Victor Zhong, Tao Yu

Their collective expertise drives OSWorld’s innovation in bridging AI research with real-world computer interactions.

## 3. Core Purpose & Impact
### What is OSWorld?
OSWorld is the first scalable environment enabling: 
- Task setup for open-ended computer operations (e.g., web/app interactions, file I/O, cross-application workflows). 
- Execution-based evaluation of agent performance. 
- Interactive learning across Ubuntu, Windows, and macOS.

### The Benchmark
With 369 real-world tasks (361 if excluding 8 Google Drive-dependent tasks), OSWorld covers domains like web browsing (Chrome), creativity (GIMP), office tools (LibreOffice), media (VLC), and coding (VS Code). Each task includes reproducible setup scripts and evaluation logic, ensuring consistency across research teams.

### Key Findings
Early evaluations reveal a stark gap: humans complete 72.36% of tasks, while top AI models achieve just 12.24%. Deficiencies center on **GUI grounding** (interpreting visual interfaces) and **operational knowledge** (understanding software workflows).

## 4. OSWorld-Verified Upgrade (2025-07-28)
The latest update introduces:
- **Fixed Edge Cases**: Addressed community-reported examples where agents failed due to unhandled UI states or ambiguous instructions. 
- **AWS Acceleration**: Cloud integration reduces evaluation time from hours to ≤60 minutes, enabling faster iteration. 
- **Revised Benchmarks**: Updated success metrics for leading models (e.g., Claude-4 Sonnet, Doubao, OpenCUA) to reflect real-world performance more accurately.

## 5. Interactive Benchmark Dashboard
*(Mockup Concept)*
A dynamic section showcasing top models, sorted by success rate: 
| Model                | Success Rate | Key Details                  |
|----------------------|--------------|------------------------------|
| claude-4-sonnet-20250514 | 43.9%        | General model, 50 max steps  |
| doubao-1-5-thinking-vision-pro-250717 | 40.0% | General model, 100 max steps |
| opencua-32b          | 34.8±0.8%    | Specialized model, 3 runs    |

Visitors can filter by model type (General/Specialized), OS, or application domain.

## 6. Resources & Community
### Quick Links
- [Paper](https://os-world.github.io/) – Read the research behind OSWorld. 
- [Code](https://github.com/xlang-ai/OSWorld) – Access open-source tools for task setup/evaluation. 
- [Doc](https://os-world.github.io/docs) – Guides for agent integration and environment configuration. 
- [Data](https://os-world.github.io/data) – Download benchmark datasets and task templates. 
- [Slides](https://os-world.github.io/slides) – Presentation decks for workshops/conferences.

### Community Channels
- [Twitter](https://twitter.com/osworld_bench) – Real-time updates and announcements. 
- [Discord](https://discord.gg/osworld) – Collaborate with researchers and report issues.

## 7. For Researchers: Evaluation & Submission
### Local Evaluation
1. Clone the [OSWorld repo](https://github.com/xlang-ai/OSWorld). 
2. Implement your agent using the [agent interface](https://github.com/xlang-ai/OSWorld/blob/main/mm_agents/README.md). 
3. Run `python run.py` to test against the benchmark.

### Public Leaderboard
To have results verified: 
1. Share your agent code (or execution logs) with the OSWorld team. 
2. Schedule a review via [tianbaoxiexxx@gmail.com](mailto:tianbaoxiexxx@gmail.com). 
3. Results are published on the *Verified Leaderboard* after validation.

## 8. FAQ
### Q: What credentials do VMs use?
Ubuntu VMs default to `user`/`password`. For AWS, use `osworld-public-evaluation` (modify for custom setups).

### Q: Google Drive tasks failing?
8 tasks may require manual auth (IP/region issues). Exclude them (361-task evaluation) or reconfigure Google API access.

### Q: Proxy setup for VMs?
Follow the [Proxy Guideline](https://github.com/xlang-ai/OSWorld/blob/main/PROXY_GUIDELINE.md) for network customization.

## 9. Technical Design (For Developers)
The website will be built with: 
- **Framework**: Next.js (for SSR, dynamic routing). 
- **Styling**: Tailwind CSS (responsive, utility-first). 
- **Interactivity**: React-Vis for benchmark charts, NextAuth for researcher login (optional). 
- **Hosting**: Vercel (for seamless deployment).

*This document serves as a blueprint. Next steps include designing UI mockups, coding components, and integrating live data feeds for benchmarks.*
# Benchmark Summary Results for https://github.com/OSU-NLP-Group/GUI-Agents-Paper-List

## Execution Time Statistics

| Strategy | Avg Time (ms) | Min Time (ms) | Max Time (ms) | Std Dev (ms) |
|----------|--------------|--------------|--------------|-------------|
| RawContent | 492.42 | 247.29 | 758.27 | 212.19 |
| CurrentMarkdown | 494.47 | 287.30 | 707.46 | 206.10 |
| Readability | 622.49 | 271.61 | 1103.75 | 334.54 |
| Optimized | 588.73 | 271.24 | 1084.25 | 318.71 |

## Content Statistics

| Strategy | Original Len | Extracted Len | Token Count |
|----------|-------------|--------------|------------|
| RawContent | 829,024 | 486,823 | 153,825 |
| CurrentMarkdown | 829,024 | 127,360 | 29,623 |
| Readability | 829,024 | 136,209 | 35,457 |
| Optimized | 829,024 | 284,810 | 79,581 |

## Compression Ratios

| Strategy | Length Ratio | Token Ratio |
|----------|-------------|------------|
| RawContent | 58.72% | 100.00% |
| CurrentMarkdown | 15.36% | 19.26% |
| Readability | 16.43% | 23.05% |
| Optimized | 34.35% | 51.73% |

# 文本与代码示例

## 一、引言
在软件开发与技术写作中，文本阐述与代码演示相辅相成。本文将结合实际场景，通过文字讲解与Python代码示例，展示如何实现简单的数据处理任务，帮助读者理解理论与实践的结合方式。

## 二、需求分析：学生成绩统计
假设我们需要处理一个班级学生的成绩数据，需求包括：
1. 读取包含学生姓名、数学、语文、英语成绩的CSV文件；
2. 计算每个学生的总成绩与平均分；
3. 统计每门学科的最高分、最低分与平均分；
4. 将处理后的数据输出为新的CSV文件，同时生成一份文本报告总结统计结果。

## 三、代码实现步骤
### （一）准备数据文件（students_scores.csv）
首先，我们需要模拟一份学生成绩数据，格式如下：
```csv
姓名,数学,语文,英语
张三,85,90,88
李四,92,87,95
王五,78,82,80
赵六,90,93,91
```

### （二）Python代码编写
以下是实现上述需求的Python代码，代码中包含详细注释以解释关键逻辑：

```python
import csv

# 定义数据结构，用于存储学生信息与学科统计数据
students = []
subjects = {"数学": [], "语文": [], "英语": []}

# 1. 读取原始CSV文件
def read_scores(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 将成绩转换为整数类型
            math_score = int(row["数学"])
            chinese_score = int(row["语文"])
            english_score = int(row["英语"])
            total = math_score + chinese_score + english_score
            average = total / 3
            student_info = {
                "姓名": row["姓名"],
                "数学": math_score,
                "语文": chinese_score,
                "英语": english_score,
                "总成绩": total,
                "平均分": round(average, 2)
            }
            students.append(student_info)
            # 将各学科成绩加入统计列表
            subjects["数学"].append(math_score)
            subjects["语文"].append(chinese_score)
            subjects["英语"].append(english_score)

# 2. 统计学科数据（最高分、最低分、平均分）
def calculate_subject_stats():
    subject_stats = {}
    for sub in subjects:
        scores = subjects[sub]
        max_score = max(scores)
        min_score = min(scores)
        avg_score = round(sum(scores) / len(scores), 2)
        subject_stats[sub] = {
            "最高分": max_score,
            "最低分": min_score,
            "平均分": avg_score
        }
    return subject_stats

# 3. 生成处理后的CSV文件
def write_processed_csv(file_path, data):
    fieldnames = ["姓名", "数学", "语文", "英语", "总成绩", "平均分"]
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)

# 4. 生成文本报告
def generate_report(subject_stats):
    report = "# 学生成绩统计报告\n\n"
    report += "## 一、学生个人成绩概况\n"
    for student in students:
        report += f"- {student['姓名']}: 总成绩{student['总成绩']}，平均分{student['平均分']}\n"
    report += "\n## 二、学科整体统计\n"
    for sub, stats in subject_stats.items():
        report += f"- {sub}: 最高分{stats['最高分']}，最低分{stats['最低分']}，平均分{stats['平均分']}\n"
    return report

if __name__ == "__main__":
    input_file = "students_scores.csv"
    output_csv = "processed_students_scores.csv"
    output_report = "score_report.txt"
    
    read_scores(input_file)
    subject_stats = calculate_subject_stats()
    write_processed_csv(output_csv, students)
    report_content = generate_report(subject_stats)
    
    with open(output_report, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print("数据处理与报告生成完成！")
```

### （三）代码逻辑解释
1. **数据读取**：`read_scores`函数使用`csv.DictReader`读取CSV文件，逐行解析学生姓名与各科成绩，计算总成绩和平均分后存入`students`列表，同时将每科成绩加入`subjects`字典的对应列表，为后续学科统计做准备。
2. **学科统计**：`calculate_subject_stats`函数遍历`subjects`字典中每门学科的成绩列表，利用内置函数`max`、`min`和求和运算，计算出每科的最高分、最低分和平均分，封装成字典返回。
3. **结果输出**：`write_processed_csv`函数使用`csv.DictWriter`将包含学生个人总成绩和平均分的新数据写入CSV文件；`generate_report`函数则拼接字符串生成文本报告，涵盖学生个人成绩概况与学科整体统计信息。

## 四、运行与验证
1. 将上述`students_scores.csv`数据保存为CSV文件，与Python代码文件放在同一目录。
2. 运行Python脚本，会在同级目录生成`processed_students_scores.csv`（处理后学生成绩）和`score_report.txt`（统计报告）。
3. 验证输出：
   - 打开`processed_students_scores.csv`，应能看到新增的“总成绩”和“平均分”列；
   - 打开`score_report.txt`，应包含每个学生的成绩总结与每门学科的统计数据。

## 五、拓展与优化思考
上述示例实现了基础的成绩处理与报告生成，但在实际项目中还可进行以下优化：
- **错误处理**：增加对文件不存在、成绩格式错误（如非数字）等异常情况的捕获与提示；
- **性能优化**：若处理大规模学生数据（如 thousands 级别），可考虑使用`pandas`库替代原生CSV操作，提升处理效率；
- **可视化增强**：结合`matplotlib`或`seaborn`库，将学科成绩分布、学生成绩对比等信息生成图表，嵌入报告或单独保存为图片，让数据更直观；
- **模块化设计**：将不同功能拆分到独立模块（如`data_read.py`、`stats_calculate.py`、`report_generate.py`），提升代码可维护性与复用性。

通过文本讲解与代码实践的结合，我们完成了一个小型的数据处理项目示例。希望读者能从中学习到如何把需求转化为代码逻辑，以及如何通过文档清晰呈现技术实现过程。后续可根据实际场景，在此基础上扩展功能、优化性能，打造更完善的解决方案。
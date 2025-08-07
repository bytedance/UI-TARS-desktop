# 任务

1. ToolCallEnginePlugin 以及继承它的子类统一改名为 ToolCallEngineProvider
2. ToolCallEnginePlugin 改为 abstract class， 支持根据传入的 ToolCallEngine 类型实现 getEngine 方法， 返回ToolCallEngine的实例，使用单例模式提升性能
3. getEngine 替代所有子类的 createEngine 方法

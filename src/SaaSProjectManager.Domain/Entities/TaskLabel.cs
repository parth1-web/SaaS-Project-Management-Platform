namespace SaaSProjectManager.Domain.Entities;

public class TaskLabel
{
    public Guid TaskId { get; set; }
    public Guid LabelId { get; set; }

    public TaskItem Task { get; set; } = null!;
    public Label Label { get; set; } = null!;
}

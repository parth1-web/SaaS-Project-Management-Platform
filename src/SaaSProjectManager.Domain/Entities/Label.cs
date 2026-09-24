namespace SaaSProjectManager.Domain.Entities;

public class Label
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#0d6efd";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TaskLabel> TaskLabels { get; set; } = new List<TaskLabel>();
}

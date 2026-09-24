using Microsoft.EntityFrameworkCore;
using SaaSProjectManager.Application.DTOs;
using SaaSProjectManager.Application.Exceptions;
using SaaSProjectManager.Application.Interfaces;

namespace SaaSProjectManager.Application.Services;

public class AttachmentService : IAttachmentService
{
    private readonly IApplicationDbContext _db;
    private readonly string _storageRoot;

    public AttachmentService(IApplicationDbContext db)
    {
        _db = db;
        _storageRoot = Path.Combine(AppContext.BaseDirectory, "uploads");
        Directory.CreateDirectory(_storageRoot);
    }

    // For testing / custom root
    public AttachmentService(IApplicationDbContext db, string storageRoot)
    {
        _db = db;
        _storageRoot = storageRoot;
        Directory.CreateDirectory(_storageRoot);
    }

    private async Task EnsureAccess(Guid userId, Guid taskId, CancellationToken ct)
    {
        var task = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == taskId, ct);
        if (task == null) throw new NotFoundException("Task not found.");
        var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == task.ProjectId, ct);
        if (project == null) throw new NotFoundException("Project not found.");
        var ok = await _db.OrganizationMembers.AnyAsync(m => m.OrganizationId == project.OrganizationId && m.UserId == userId, ct);
        if (!ok) throw new ForbiddenException("No access.");
    }

    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    { ".png",".jpg",".jpeg",".pdf",".txt",".md",".docx",".xlsx",".csv",".zip" };
    private const long MaxSize = 10 * 1024 * 1024;

    public async Task<AttachmentDto> UploadAsync(Guid userId, Guid taskId, string fileName, string contentType, long size, Stream content, CancellationToken ct = default)
    {
        await EnsureAccess(userId, taskId, ct);
        var ext = Path.GetExtension(fileName);
        if (!Allowed.Contains(ext)) throw new ConflictException($"File type {ext} not allowed.");
        if (size > MaxSize) throw new ConflictException("File exceeds 10MB limit.");

        var safe = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(_storageRoot, safe);
        using (var fs = File.Create(fullPath))
            await content.CopyToAsync(fs, ct);

        var att = new Domain.Entities.Attachment
        {
            TaskId = taskId, FileName = Path.GetFileName(fileName),
            StoredFileName = safe, ContentType = contentType,
            Size = size, StoragePath = fullPath, UploadedBy = userId
        };
        _db.Attachments.Add(att);
        await _db.SaveChangesAsync(ct);
        return new AttachmentDto(att.Id, att.TaskId, att.FileName, att.ContentType, att.Size, att.UploadedBy, att.CreatedAt);
    }

    public async Task<List<AttachmentDto>> ListAsync(Guid userId, Guid taskId, CancellationToken ct = default)
    {
        await EnsureAccess(userId, taskId, ct);
        var items = await _db.Attachments.Where(a => a.TaskId == taskId).OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return items.Select(a => new AttachmentDto(a.Id, a.TaskId, a.FileName, a.ContentType, a.Size, a.UploadedBy, a.CreatedAt)).ToList();
    }

    public async Task<(Stream content, string contentType, string fileName)> DownloadAsync(Guid userId, Guid attachmentId, CancellationToken ct = default)
    {
        var att = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId, ct);
        if (att == null) throw new NotFoundException("Attachment not found.");
        await EnsureAccess(userId, att.TaskId, ct);
        if (!File.Exists(att.StoragePath)) throw new NotFoundException("File missing on disk.");
        var stream = File.OpenRead(att.StoragePath);
        return (stream, att.ContentType, att.FileName);
    }

    public async Task DeleteAsync(Guid userId, Guid attachmentId, CancellationToken ct = default)
    {
        var att = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == attachmentId, ct);
        if (att == null) throw new NotFoundException("Attachment not found.");
        await EnsureAccess(userId, att.TaskId, ct);
        if (File.Exists(att.StoragePath)) File.Delete(att.StoragePath);
        _db.Attachments.Remove(att);
        await _db.SaveChangesAsync(ct);
    }
}

# macOS System Data Storage Cleaner

A comprehensive shell script to help clean up various caches, logs, and temporary files that accumulate on macOS systems and consume disk space.

## Features

The cleaner script helps you reclaim disk space by cleaning:

- **System and User Caches**: Application caches stored in `~/Library/Caches`
- **System Logs**: Log files in `~/Library/Logs`
- **Temporary Files**: Files in `/tmp`, `$TMPDIR`, and crash reports
- **Trash**: Empty the trash bin
- **Xcode Data** (if present): DerivedData, Archives, and Simulator caches
- **Homebrew Cache** (if present): Downloaded package caches
- **Application Caches**: Browser and application-specific caches

## Usage

### Basic Usage

```bash
./clean-macos-storage.sh
```

This will run the script interactively, prompting you for confirmation before cleaning each category.

### Dry Run Mode (Recommended for First Use)

```bash
./clean-macos-storage.sh --dry-run
```

This mode shows what would be deleted without actually deleting anything. Use this to preview the actions before running the actual cleanup.

### Clean All Without Prompts

```bash
./clean-macos-storage.sh --all
```

This will clean all categories without prompting for confirmation. Use with caution!

### Display Help

```bash
./clean-macos-storage.sh --help
```

## Safety Features

1. **macOS Detection**: The script only runs on macOS systems
2. **Dry Run Mode**: Preview what will be deleted before committing
3. **Interactive Confirmation**: Each category requires confirmation (unless `--all` is used)
4. **Size Reporting**: Shows the size of each category before cleaning
5. **Conservative Temporary File Cleaning**: Only deletes temporary files older than 3 days
6. **Progress Tracking**: Reports space freed for each category

## Output Example

```
======================================
macOS System Data Storage Cleaner
======================================

Running in DRY RUN mode - no files will be deleted

======================================
Cleaning System Caches
======================================
ℹ User caches size: 1245 MB
⚠ [DRY RUN] Would clean user caches

======================================
Cleaning Complete
======================================
ℹ Dry run complete. Run without --dry-run to actually clean files.
```

## Requirements

- macOS operating system
- Bash shell (pre-installed on macOS)
- Read/write permissions to your user directories

## Permissions

The script only cleans files and directories that your user account has permission to access. It does **not** require `sudo` or administrator privileges, making it safer to use.

## Important Notes

1. **Backup Important Data**: Always ensure you have backups of important data before running cleanup scripts
2. **Application Caches**: Some applications may need to rebuild their caches after cleaning, which might cause temporary slowdowns
3. **Xcode**: If you're actively developing with Xcode, you may want to skip cleaning DerivedData
4. **Browser Caches**: Cleaning browser caches will log you out of some websites

## Troubleshooting

### Script Won't Run

Make sure the script is executable:
```bash
chmod +x clean-macos-storage.sh
```

### "Permission Denied" Errors

The script only cleans files you have permission to access. Some system-level caches require administrator privileges and are intentionally skipped for safety.

## Contributing

If you find issues or have suggestions for improvement, please open an issue or submit a pull request.

## License

This script is part of the espocrm-render repository and follows the same license.

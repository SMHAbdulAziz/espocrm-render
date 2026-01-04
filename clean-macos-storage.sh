#!/bin/bash

#######################################################################
# macOS System Data Storage Cleaner
#
# This script helps clean up various caches, logs, and temporary files
# that accumulate on macOS systems and consume disk space.
#
# Usage:
#   ./clean-macos-storage.sh [OPTIONS]
#
# Options:
#   --dry-run    Show what would be deleted without actually deleting
#   --help       Display this help message
#   --all        Clean all categories without prompting
#
# Categories cleaned:
#   - System caches
#   - User caches
#   - System logs
#   - Temporary files
#   - Trash
#   - Xcode derived data (if present)
#   - Homebrew cache (if present)
#   - Application caches
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
CLEAN_ALL=false

# Track total space freed
TOTAL_FREED=0

#######################################################################
# Helper Functions
#######################################################################

print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Get size of a directory in MB
get_dir_size() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sm "$dir" 2>/dev/null | awk '{print $1}' || echo "0"
    else
        echo "0"
    fi
}

# Calculate space freed
calculate_freed() {
    local before=$1
    local after=$2
    echo $((before - after))
}

# Ask for confirmation
confirm() {
    local message="$1"
    if [ "$CLEAN_ALL" = true ]; then
        return 0
    fi
    
    echo -e "${YELLOW}$message (y/N): ${NC}"
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY]) 
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Clean directory
clean_directory() {
    local dir="$1"
    local description="$2"
    
    if [ ! -d "$dir" ]; then
        print_info "$description: Directory not found, skipping"
        return
    fi
    
    local before=$(get_dir_size "$dir")
    
    if [ "$before" -eq 0 ]; then
        print_info "$description: Already clean (0 MB)"
        return
    fi
    
    print_info "$description: Current size: ${before} MB"
    
    if [ "$DRY_RUN" = true ]; then
        print_warning "[DRY RUN] Would clean: $dir"
        return
    fi
    
    if confirm "Clean $description?"; then
        rm -rf "${dir:?}"/* 2>/dev/null || true
        local after=$(get_dir_size "$dir")
        local freed=$(calculate_freed $before $after)
        TOTAL_FREED=$((TOTAL_FREED + freed))
        print_success "$description cleaned: Freed ${freed} MB"
    else
        print_info "$description: Skipped"
    fi
}

# Clean files matching pattern
clean_files_pattern() {
    local pattern="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        local count=$(find $pattern 2>/dev/null | wc -l | xargs)
        if [ "$count" -gt 0 ]; then
            print_warning "[DRY RUN] Would clean $count files: $description"
        fi
        return
    fi
    
    if confirm "Clean $description?"; then
        local count=$(find $pattern -delete 2>/dev/null | wc -l | xargs)
        if [ "$count" -gt 0 ]; then
            print_success "$description cleaned: $count files"
        else
            print_info "$description: No files found"
        fi
    else
        print_info "$description: Skipped"
    fi
}

#######################################################################
# Cleaning Functions
#######################################################################

clean_system_caches() {
    print_header "Cleaning System Caches"
    
    # Note: Some system caches require sudo, which we'll skip for safety
    local user_cache="$HOME/Library/Caches"
    
    if [ -d "$user_cache" ]; then
        local before=$(get_dir_size "$user_cache")
        print_info "User caches size: ${before} MB"
        
        if [ "$DRY_RUN" = false ] && confirm "Clean user caches?"; then
            # Clean only cache files, not directories themselves
            find "$user_cache" -type f -delete 2>/dev/null || true
            local after
            after=$(get_dir_size "$user_cache")
            local freed
            freed=$(calculate_freed "$before" "$after")
            TOTAL_FREED=$((TOTAL_FREED + freed))
            print_success "User caches cleaned: Freed ${freed} MB"
        elif [ "$DRY_RUN" = true ]; then
            print_warning "[DRY RUN] Would clean user caches"
        else
            print_info "User caches: Skipped"
        fi
    fi
}

clean_system_logs() {
    print_header "Cleaning System Logs"
    
    local log_dirs=(
        "$HOME/Library/Logs"
    )
    
    for dir in "${log_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local before=$(get_dir_size "$dir")
            print_info "Logs in $dir: ${before} MB"
            
            if [ "$DRY_RUN" = false ] && confirm "Clean logs in $dir?"; then
                find "$dir" -type f -name "*.log" -delete 2>/dev/null || true
                find "$dir" -type f -name "*.old" -delete 2>/dev/null || true
                local after
                after=$(get_dir_size "$dir")
                local freed
                freed=$(calculate_freed "$before" "$after")
                TOTAL_FREED=$((TOTAL_FREED + freed))
                print_success "Logs cleaned: Freed ${freed} MB"
            elif [ "$DRY_RUN" = true ]; then
                print_warning "[DRY RUN] Would clean logs"
            else
                print_info "Logs: Skipped"
            fi
        fi
    done
}

clean_temporary_files() {
    print_header "Cleaning Temporary Files"
    
    local temp_dirs=(
        "/tmp"
        "$HOME/Library/Application Support/CrashReporter"
        "$TMPDIR"
    )
    
    for dir in "${temp_dirs[@]}"; do
        if [ -n "$dir" ] && [ -d "$dir" ]; then
            local before=$(get_dir_size "$dir")
            if [ "$before" -gt 0 ]; then
                print_info "Temporary files in $dir: ${before} MB"
                
                if [ "$DRY_RUN" = false ] && confirm "Clean temporary files in $dir?"; then
                    # Only clean files older than 3 days for safety
                    find "$dir" -type f -mtime +3 -delete 2>/dev/null || true
                    local after
                    after=$(get_dir_size "$dir")
                    local freed
                    freed=$(calculate_freed "$before" "$after")
                    TOTAL_FREED=$((TOTAL_FREED + freed))
                    print_success "Temporary files cleaned: Freed ${freed} MB"
                elif [ "$DRY_RUN" = true ]; then
                    print_warning "[DRY RUN] Would clean temporary files"
                else
                    print_info "Temporary files: Skipped"
                fi
            fi
        fi
    done
}

clean_trash() {
    print_header "Cleaning Trash"
    
    local trash="$HOME/.Trash"
    
    if [ -d "$trash" ]; then
        local before=$(get_dir_size "$trash")
        if [ "$before" -gt 0 ]; then
            print_info "Trash size: ${before} MB"
            
            if [ "$DRY_RUN" = false ] && confirm "Empty trash?"; then
                rm -rf "${trash:?}"/* 2>/dev/null || true
                local after
                after=$(get_dir_size "$trash")
                local freed
                freed=$(calculate_freed "$before" "$after")
                TOTAL_FREED=$((TOTAL_FREED + freed))
                print_success "Trash emptied: Freed ${freed} MB"
            elif [ "$DRY_RUN" = true ]; then
                print_warning "[DRY RUN] Would empty trash"
            else
                print_info "Trash: Skipped"
            fi
        else
            print_info "Trash is already empty"
        fi
    fi
}

clean_xcode_data() {
    print_header "Cleaning Xcode Data"
    
    local xcode_dirs=(
        "$HOME/Library/Developer/Xcode/DerivedData"
        "$HOME/Library/Developer/Xcode/Archives"
        "$HOME/Library/Developer/CoreSimulator/Caches"
    )
    
    local has_xcode=false
    for dir in "${xcode_dirs[@]}"; do
        if [ -d "$dir" ]; then
            has_xcode=true
            clean_directory "$dir" "Xcode $(basename "$(dirname "$dir")")/$(basename "$dir")"
        fi
    done
    
    if [ "$has_xcode" = false ]; then
        print_info "Xcode not found, skipping"
    fi
}

clean_homebrew_cache() {
    print_header "Cleaning Homebrew Cache"
    
    if command -v brew &> /dev/null; then
        local cache_dir="$(brew --cache 2>/dev/null || echo '')"
        
        if [ -n "$cache_dir" ] && [ -d "$cache_dir" ]; then
            local before=$(get_dir_size "$cache_dir")
            print_info "Homebrew cache size: ${before} MB"
            
            if [ "$DRY_RUN" = false ] && confirm "Clean Homebrew cache?"; then
                brew cleanup -s 2>/dev/null || true
                rm -rf "${cache_dir:?}"/* 2>/dev/null || true
                local after
                after=$(get_dir_size "$cache_dir")
                local freed
                freed=$(calculate_freed "$before" "$after")
                TOTAL_FREED=$((TOTAL_FREED + freed))
                print_success "Homebrew cache cleaned: Freed ${freed} MB"
            elif [ "$DRY_RUN" = true ]; then
                print_warning "[DRY RUN] Would clean Homebrew cache"
            else
                print_info "Homebrew cache: Skipped"
            fi
        fi
    else
        print_info "Homebrew not found, skipping"
    fi
}

clean_application_caches() {
    print_header "Cleaning Application Caches"
    
    # Common application cache directories
    local app_caches=(
        "$HOME/Library/Caches/com.google.Chrome"
        "$HOME/Library/Caches/com.apple.Safari"
        "$HOME/Library/Caches/Firefox"
        "$HOME/Library/Caches/Slack"
        "$HOME/Library/Caches/com.spotify.client"
    )
    
    for cache_dir in "${app_caches[@]}"; do
        if [ -d "$cache_dir" ]; then
            local app_name=$(basename "$cache_dir")
            local before=$(get_dir_size "$cache_dir")
            
            if [ "$before" -gt 0 ]; then
                print_info "$app_name cache: ${before} MB"
                
                if [ "$DRY_RUN" = false ] && confirm "Clean $app_name cache?"; then
                    rm -rf "${cache_dir:?}"/* 2>/dev/null || true
                    local after
                    after=$(get_dir_size "$cache_dir")
                    local freed
                    freed=$(calculate_freed "$before" "$after")
                    TOTAL_FREED=$((TOTAL_FREED + freed))
                    print_success "$app_name cache cleaned: Freed ${freed} MB"
                elif [ "$DRY_RUN" = true ]; then
                    print_warning "[DRY RUN] Would clean $app_name cache"
                else
                    print_info "$app_name cache: Skipped"
                fi
            fi
        fi
    done
}

#######################################################################
# Main Script
#######################################################################

show_help() {
    echo "macOS System Data Storage Cleaner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be deleted without actually deleting"
    echo "  --all        Clean all categories without prompting"
    echo "  --help       Display this help message"
    echo ""
    echo "Categories cleaned:"
    echo "  - System and user caches"
    echo "  - System logs"
    echo "  - Temporary files"
    echo "  - Trash"
    echo "  - Xcode derived data (if present)"
    echo "  - Homebrew cache (if present)"
    echo "  - Application caches"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is designed for macOS only"
    exit 1
fi

# Display banner
clear
print_header "macOS System Data Storage Cleaner"
echo ""

if [ "$DRY_RUN" = true ]; then
    print_warning "Running in DRY RUN mode - no files will be deleted"
    echo ""
fi

if [ "$CLEAN_ALL" = true ]; then
    print_info "Cleaning all categories without prompting"
    echo ""
fi

# Run cleaning functions
clean_system_caches
echo ""

clean_system_logs
echo ""

clean_temporary_files
echo ""

clean_trash
echo ""

clean_xcode_data
echo ""

clean_homebrew_cache
echo ""

clean_application_caches
echo ""

# Display summary
print_header "Cleaning Complete"
if [ "$DRY_RUN" = false ]; then
    print_success "Total space freed: ${TOTAL_FREED} MB ($(echo "scale=2; $TOTAL_FREED/1024" | bc) GB)"
else
    print_info "Dry run complete. Run without --dry-run to actually clean files."
fi
echo ""

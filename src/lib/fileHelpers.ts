export const getFileIconDetails = (fileName: string, itemType: string) => {
  if (itemType === 'folder') {
    return {
      name: 'folder',
      classes: 'text-primary/70 group-hover:text-primary transition-colors icon-fill',
    };
  }
  if (itemType === 'folder_shared') {
    return {
      name: 'folder_shared',
      classes: 'text-primary/70 group-hover:text-primary transition-colors icon-fill',
    };
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return { name: 'picture_as_pdf', classes: 'text-[#ea4335] icon-fill' };
    case 'docx':
    case 'doc':
      return { name: 'description', classes: 'text-[#1a73e8] icon-fill' };
    case 'pptx':
    case 'ppt':
      return { name: 'slideshow', classes: 'text-[#f15a24] icon-fill' };
    case 'xlsx':
    case 'xls':
    case 'csv':
      return { name: 'table_chart', classes: 'text-[#0f9d58] icon-fill' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return { name: 'image', classes: 'text-teal-500 icon-fill' };
    default:
      return { name: 'insert_drive_file', classes: 'text-secondary icon-fill' };
  }
};

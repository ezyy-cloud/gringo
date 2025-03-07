import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Toolbar,
  alpha,
  CircularProgress,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  renderCell?: (props: { row: any; value: any }) => React.ReactNode;
  field?: string;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  title?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  loading?: boolean;
  pageSize?: number;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows = [],
  title = 'Data',
  onEdit,
  onDelete,
  selectable = false,
  loading = false,
  pageSize = 10,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = rows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (_event: React.MouseEvent<unknown>, id: string) => {
    if (!selectable) return;
    
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id: string) => {
    return selected.indexOf(id) !== -1;
  };
  
  // Filter menu handling
  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterColumnSelect = (columnId: string) => {
    setFilterColumn(columnId);
    setShowFilter(true);
    handleFilterClose();
  };

  const handleFilterTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
    setPage(0); // Reset to first page when filter changes
  };

  const handleClearFilter = () => {
    setFilterText('');
    setShowFilter(false);
    setFilterColumn('');
  };
  
  // Filter the rows based on filterText and filterColumn
  const applyFilter = (row: any): boolean => {
    if (!filterText || !filterColumn) return true;
    
    const value = row[filterColumn];
    if (value === undefined || value === null) return false;
    
    return String(value).toLowerCase().includes(filterText.toLowerCase());
  };

  const filteredRows = rows.filter(applyFilter);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selected.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.2),
          }),
        }}
      >
        {selected.length > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selected.length} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            {title}
          </Typography>
        )}

        {showFilter ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              variant="outlined"
              size="small"
              placeholder={`Filter by ${columns.find(col => col.id === filterColumn)?.label ?? filterColumn}`}
              value={filterText}
              onChange={handleFilterTextChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearFilter}
                      edge="end"
                    >
                      <CloseIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        ) : (
          selected.length > 0 ? (
            <Tooltip title="Delete">
              <IconButton>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Filter list">
              <IconButton onClick={handleFilterClick}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
          )
        )}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterClose}
        >
          {columns.map((column) => (
            <MenuItem 
              key={`filter-${column.id}`} 
              onClick={() => handleFilterColumnSelect(column.id)}
            >
              {column.label}
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" key="select-all-checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < rows.length}
                    checked={rows.length > 0 && selected.length === rows.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all' }}
                  />
                </TableCell>
              )}
              {columns.map((column, index) => {
                // Ensure each column has a unique identifier
                const columnId = column.id ?? column.field ?? `column-${index}`;
                return (
                  <TableCell
                    key={columnId}
                    align={column.align ?? 'left'}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                );
              })}
              {(onEdit ?? onDelete) && <TableCell align="right" key="actions-header">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow key="loading-row">
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + ((onEdit ?? onDelete) ? 1 : 0)}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow key="no-data-row">
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + ((onEdit ?? onDelete) ? 1 : 0)}>
                  <Box sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      {filterText ? 'No matching results' : 'No data available'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, rowIndex) => {
                  const rowId = row.id !== undefined ? row.id : `row-${rowIndex}`;
                  const isItemSelected = isSelected(String(rowId));
                  return (
                    <TableRow
                      hover
                      onClick={(event) => handleClick(event, String(rowId))}
                      tabIndex={-1}
                      key={row?._id ?? row?.id ?? `row-${rowIndex}`}
                      selected={isItemSelected}
                    >
                      {selectable && (
                        <TableCell padding="checkbox" key={`checkbox-${rowId}`}>
                          <input 
                            type="checkbox" 
                            checked={isItemSelected}
                            onChange={() => {}} // Add an empty onChange handler to avoid React warning
                            onClick={(e) => e.stopPropagation()} // Prevent row click event
                            style={{ 
                              width: '18px', 
                              height: '18px',
                              cursor: 'pointer'
                            }}
                            title={`Select row ${rowId}`}
                            aria-label={`Select row ${rowId}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column, colIndex) => {
                        // Ensure each column has a unique identifier
                        const columnId = column.id ?? column.field ?? `column-${colIndex}`;
                        return (
                          <TableCell key={`cell-${rowId}-${columnId}`} align={column.align ?? 'left'}>
                            {column.renderCell
                              ? (row ? column.renderCell({ row, value: row[column.field ?? column.id] }) : null)
                              : (row && column.field && typeof row === 'object' && column.field in row 
                                  ? row[column.field]
                                  : (row && column.id && typeof row === 'object' && column.id in row 
                                      ? row[column.id] 
                                      : ''))}
                          </TableCell>
                        );
                      })}
                      {(onEdit ?? onDelete) && (
                        <TableCell align="right" key={`actions-${rowId}`}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {onEdit && (
                              <Tooltip title="Edit" key={`edit-action-${rowId}`}>
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(rowId);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {onDelete && (
                              <Tooltip title="Delete" key={`delete-action-${rowId}`}>
                                <IconButton
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(rowId);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default DataTable;
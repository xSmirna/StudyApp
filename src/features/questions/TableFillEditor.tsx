import {
  MAX_TABLE_COLUMNS,
  MAX_TABLE_DATA_ROWS,
  type TableFillData,
} from '../../domain/types'

type TableFillEditorProps = {
  table: TableFillData
  onChange: (table: TableFillData) => void
}

function emptyRow(cols: number): string[] {
  return Array.from({ length: cols }, () => '')
}

export function createEmptyTable(
  cols = 2,
  rows = 2,
): TableFillData {
  const columnCount = Math.min(MAX_TABLE_COLUMNS, Math.max(1, cols))
  const rowCount = Math.min(MAX_TABLE_DATA_ROWS, Math.max(1, rows))
  return {
    headers: Array.from({ length: columnCount }, (_, index) => `Column ${index + 1}`),
    rows: Array.from({ length: rowCount }, () => emptyRow(columnCount)),
  }
}

export function TableFillEditor({ table, onChange }: TableFillEditorProps) {
  const colCount = table.headers.length

  function updateHeader(index: number, value: string) {
    const headers = table.headers.map((header, headerIndex) =>
      headerIndex === index ? value : header,
    )
    onChange({ ...table, headers })
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    const rows = table.rows.map((row, index) =>
      index === rowIndex
        ? row.map((cell, cellIndex) => (cellIndex === colIndex ? value : cell))
        : row,
    )
    onChange({ ...table, rows })
  }

  function addColumn() {
    if (colCount >= MAX_TABLE_COLUMNS) return
    onChange({
      headers: [...table.headers, `Column ${colCount + 1}`],
      rows: table.rows.map((row) => [...row, '']),
    })
  }

  function removeColumn() {
    if (colCount <= 1) return
    onChange({
      headers: table.headers.slice(0, -1),
      rows: table.rows.map((row) => row.slice(0, -1)),
    })
  }

  function addRow() {
    if (table.rows.length >= MAX_TABLE_DATA_ROWS) return
    onChange({
      ...table,
      rows: [...table.rows, emptyRow(colCount)],
    })
  }

  function removeRow() {
    if (table.rows.length <= 1) return
    onChange({
      ...table,
      rows: table.rows.slice(0, -1),
    })
  }

  return (
    <fieldset className="option-fieldset table-fill-editor">
      <legend>Table</legend>
      <p className="muted">
        Header row plus up to {MAX_TABLE_DATA_ROWS} data rows and{' '}
        {MAX_TABLE_COLUMNS} columns. Fill every cell.
      </p>
      <div className="row-actions table-fill-toolbar">
        <button type="button" onClick={addColumn} disabled={colCount >= MAX_TABLE_COLUMNS}>
          Add column
        </button>
        <button type="button" onClick={removeColumn} disabled={colCount <= 1}>
          Remove column
        </button>
        <button
          type="button"
          onClick={addRow}
          disabled={table.rows.length >= MAX_TABLE_DATA_ROWS}
        >
          Add row
        </button>
        <button type="button" onClick={removeRow} disabled={table.rows.length <= 1}>
          Remove row
        </button>
      </div>

      <div className="table-fill-scroll">
        <table className="table-fill-grid">
          <thead>
            <tr>
              {table.headers.map((header, index) => (
                <th key={`header-${index}`}>
                  <label className="sr-only" htmlFor={`table-header-${index}`}>
                    Header {index + 1}
                  </label>
                  <input
                    id={`table-header-${index}`}
                    value={header}
                    onChange={(event) => updateHeader(index, event.target.value)}
                    placeholder={`Header ${index + 1}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`}>
                    <label
                      className="sr-only"
                      htmlFor={`table-cell-${rowIndex}-${colIndex}`}
                    >
                      Row {rowIndex + 1} column {colIndex + 1}
                    </label>
                    <input
                      id={`table-cell-${rowIndex}-${colIndex}`}
                      value={cell}
                      onChange={(event) =>
                        updateCell(rowIndex, colIndex, event.target.value)
                      }
                      placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  )
}

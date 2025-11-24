import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { useDatabase } from '../context/DBProvider';
import { downloadLog, exportData, importFiles } from '../services/importExportService';
import { DataType, ImportOptions } from '../services/importExportService';
import { ImportExportLog } from '../models/ImportExportLog';

const templateFiles: { label: string; file: string }[] = [
  { label: 'Areas', file: 'areas_template.csv' },
  { label: 'Categories', file: 'categories_template.csv' },
  { label: 'Products', file: 'products_template.csv' },
  { label: 'Pick Lists', file: 'picklists_template.csv' },
  { label: 'Pick Items', file: 'pickitems_template.csv' },
];

const dataTypes: { key: DataType; label: string }[] = [
  { key: 'areas', label: 'Areas' },
  { key: 'categories', label: 'Categories' },
  { key: 'products', label: 'Products' },
  { key: 'pick-lists', label: 'Pick Lists' },
  { key: 'pick-items', label: 'Pick Items' },
];

export const ImportExportScreen = () => {
  const db = useDatabase();
  const [selectedTypes, setSelectedTypes] = useState<DataType[]>(dataTypes.map((d) => d.key));
  const [logLines, setLogLines] = useState<string[]>([]);
  const [history, setHistory] = useState<ImportExportLog[]>([]);
  const [allowAutoCreateMissing, setAllowAutoCreateMissing] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const appendLog = (line: string) => setLogLines((prev) => [...prev, line]);

  useEffect(() => {
    const subscription = liveQuery(() => db.importExportLogs.orderBy('timestamp').reverse().toArray()).subscribe({
      next: (logs) => setHistory(logs),
    });
    return () => subscription.unsubscribe();
  }, [db]);

  const handleToggleType = (key: DataType) => {
    setSelectedTypes((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const handleSelectAll = () => {
    if (selectedTypes.length === dataTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(dataTypes.map((d) => d.key));
    }
  };

  const handleExport = async () => {
    setLogLines([]);
    try {
      await exportData(db, selectedTypes, appendLog);
      appendLog('Export complete');
    } catch (error) {
      appendLog(`Export failed: ${(error as Error).message}`);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      appendLog(`Selected ${files.length} file(s) for import`);
    }
  };

  const handleImport = async () => {
    setLogLines([]);
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      appendLog('Please select files to import');
      return;
    }
    const importOptions: ImportOptions = {
      allowAutoCreateMissing,
    };
    try {
      await importFiles(db, Array.from(files), importOptions, appendLog);
      appendLog('Import complete');
    } catch (error) {
      appendLog(`Import failed: ${(error as Error).message}`);
    }
  };

  const latestLog = useMemo(() => history[0], [history]);

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Import / Export Data
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Templates
              </Typography>
              <Stack spacing={1}>
                {templateFiles.map((template) => (
                  <Button key={template.file} variant="outlined" component="a" href={`/templates/${template.file}`} download>
                    Download {template.label} Template
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Types
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={<Checkbox checked={selectedTypes.length === dataTypes.length} onChange={handleSelectAll} />}
                  label="Select all"
                />
                <Divider />
                {dataTypes.map((type) => (
                  <FormControlLabel
                    key={type.key}
                    control={<Checkbox checked={selectedTypes.includes(type.key)} onChange={() => handleToggleType(type.key)} />}
                    label={type.label}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Stack spacing={2}>
                <Button variant="contained" disabled={selectedTypes.length === 0} onClick={handleExport}>
                  Export Selected
                </Button>
                <Button variant="outlined" component="label">
                  Select CSV or ZIP
                  <input ref={fileInputRef} type="file" accept=".csv,.zip" multiple hidden onChange={handleFileChange} />
                </Button>
                <Button variant="contained" color="secondary" onClick={handleImport}>
                  Import Files
                </Button>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allowAutoCreateMissing}
                      onChange={(event) => setAllowAutoCreateMissing(event.target.checked)}
                    />
                  }
                  label="Allow auto-create missing referenced entities"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box mt={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Log
            </Typography>
            <Box
              component="pre"
              sx={{ backgroundColor: '#f6f6f6', p: 2, borderRadius: 1, maxHeight: 240, overflow: 'auto' }}
            >
              {logLines.length === 0 ? 'No log entries yet' : logLines.join('\n')}
            </Box>
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                variant="outlined"
                disabled={!latestLog}
                onClick={() => {
                  if (latestLog) downloadLog(latestLog);
                }}
              >
                Download latest log
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1">History</Typography>
            <List dense>
              {history.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemText
                    primary={`${new Date(item.timestamp).toLocaleString()} — ${item.type}`}
                    secondary={`Inserted: ${item.summary.inserted}, Skipped: ${item.summary.skipped}, Errors: ${item.summary.errors}`}
                  />
                  <Button size="small" onClick={() => downloadLog(item)}>
                    Download
                  </Button>
                </ListItem>
              ))}
              {history.length === 0 && <ListItem>No past logs</ListItem>}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

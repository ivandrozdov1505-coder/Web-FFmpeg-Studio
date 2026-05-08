import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Switch } from './components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Upload, FileVideo2, Play, Settings2, Download, Terminal, Film, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from './components/ui/textarea';

type Mode = 'convert' | 'gif' | 'metadata' | 'custom';

export default function App() {
  const { t, i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  
  const ffmpegRef = useRef(new FFmpeg());
  const logRef = useRef<HTMLTextAreaElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>('convert');
  const [logs, setLogs] = useState<string>('');

  // Conversion state
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [videoCodec, setVideoCodec] = useState('copy');
  const [audioCodec, setAudioCodec] = useState('copy');
  const [videoPreset, setVideoPreset] = useState('none');
  const [videoBitrate, setVideoBitrate] = useState('');
  const [videoCrf, setVideoCrf] = useState('');
  const [videoResolution, setVideoResolution] = useState('original');
  const [customResX, setCustomResX] = useState('');
  const [customResY, setCustomResY] = useState('');
  const [videoCrop, setVideoCrop] = useState('none');
  const [customCropW, setCustomCropW] = useState('');
  const [customCropH, setCustomCropH] = useState('');
  const [customCropX, setCustomCropX] = useState('0');
  const [customCropY, setCustomCropY] = useState('0');
  const [videoStabilization, setVideoStabilization] = useState('none');
  const [convertTrimStart, setConvertTrimStart] = useState('');
  const [convertTrimEnd, setConvertTrimEnd] = useState('');
  const [additionalFlags, setAdditionalFlags] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // GIF state
  const [gifStart, setGifStart] = useState('00:00:00');
  const [gifDuration, setGifDuration] = useState('5');
  const [gifFps, setGifFps] = useState('10');
  const [gifScale, setGifScale] = useState('320');
  const [gifDither, setGifDither] = useState('sierra2_4a');
  const [gifColors, setGifColors] = useState('256');
  const [gifStatsMode, setGifStatsMode] = useState('full');
  
  // Metadata state
  const [metaTitle, setMetaTitle] = useState('');
  const [metaArtist, setMetaArtist] = useState('');

  // Custom state
  const [customArgs, setCustomArgs] = useState('-i input.mp4 output.mp4');

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on('log', ({ message }) => {
      setLogs((prev) => prev + message + '\n');
      console.log(message);
    });
    ffmpeg.on('progress', ({ progress, time }) => {
      setProgress(Math.round(progress * 100));
      setStatus(`Processing: ${Math.round(progress * 100)}% (time: ${time}us)`);
    });
    
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
      setLoadingMsg('');
    } catch (e) {
      console.error(e);
      setLoadingMsg('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // reset custom args with new file name
      setCustomArgs(`-i "${e.target.files[0].name}" output.mp4`);
      setResultUrl(null);
      setProgress(0);
      setStatus('');
    }
  };

  const getOutputExt = () => {
    if (mode === 'gif') return 'gif';
    if (mode === 'metadata') return file?.name.split('.').pop() || 'mp4';
    if (mode === 'custom') {
      const parts = customArgs.split(' ');
      return parts[parts.length - 1].split('.').pop() || 'mp4';
    }
    return outputFormat;
  };

  const execute = async () => {
    if (!file) return;
    
    const ffmpeg = ffmpegRef.current;
    
    const inputName = file.name;
    const outputName = `output_${Date.now()}.${getOutputExt()}`;
    
    setLogs('');
    setProgress(0);
    setStatus('Reading file...');
    setResultUrl(null);
    
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      
      let args: string[] = [];
      
      if (mode === 'convert') {
        if (convertTrimStart.trim()) {
          args.push('-ss', convertTrimStart.trim());
        }
        if (convertTrimEnd.trim()) {
          args.push('-to', convertTrimEnd.trim());
        }
        args.push('-i', inputName);
        if (videoCodec !== 'copy') {
          let vfFilters: string[] = [];
          
          // Crop
          if (videoCrop !== 'none') {
            if (videoCrop === '1:1') vfFilters.push(`crop=ih:ih`);
            else if (videoCrop === '4:3') vfFilters.push(`crop=ih*(4/3):ih`);
            else if (videoCrop === '16:9') vfFilters.push(`crop=ih*(16/9):ih`);
            else if (videoCrop === 'custom' && customCropW && customCropH) {
              vfFilters.push(`crop=${customCropW}:${customCropH}:${customCropX || 0}:${customCropY || 0}`);
            }
          }
          
          // Scale/Resolution
          if (videoResolution !== 'original') {
             if (videoResolution === 'custom' && customResX && customResY) {
                 vfFilters.push(`scale=${customResX}:${customResY}`);
             } else if (videoResolution !== 'custom') {
                 const [scaleX, scaleY] = videoResolution.split('x');
                 vfFilters.push(`scale=${scaleX}:${scaleY}`);
             }
          }

          // Stabilization
          if (videoStabilization !== 'none') {
            if (videoStabilization === 'default') {
              vfFilters.push('deshake');
            } else if (videoStabilization === 'strong') {
              vfFilters.push('deshake=x=60:y=60:rx=64:edge=2');
            }
          }

          args.push('-c:v', videoCodec);
          if (vfFilters.length > 0) {
            args.push('-vf', vfFilters.join(','));
          }

          if (videoPreset !== 'none') {
            args.push('-preset', videoPreset);
          }
          if (videoCrf.trim()) {
            args.push('-crf', videoCrf.trim());
          }
          if (videoBitrate.trim()) {
            args.push('-b:v', videoBitrate.trim());
          }
        } else {
          args.push('-c:v', 'copy');
        }
        
        if (audioCodec !== 'copy') {
          args.push('-c:a', audioCodec);
        } else {
          args.push('-c:a', 'copy');
        }

        if (additionalFlags.trim()) {
          const customOpts = additionalFlags.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
          args.push(...customOpts.map(arg => arg.replace(/^"|"$/g, '')));
        }
        
        args.push(outputName);
        
      } else if (mode === 'gif') {
        args = [
          '-ss', gifStart,
          '-t', gifDuration,
          '-i', inputName,
          '-vf', `fps=${gifFps},scale=${gifScale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${gifColors}:stats_mode=${gifStatsMode}[p];[s1][p]paletteuse=dither=${gifDither}`,
          '-loop', '0',
          outputName
        ];
        
      } else if (mode === 'metadata') {
        args = ['-i', inputName, '-c', 'copy'];
        if (metaTitle) args.push('-metadata', `title=${metaTitle}`);
        if (metaArtist) args.push('-metadata', `artist=${metaArtist}`);
        args.push(outputName);
        
      } else if (mode === 'custom') {
        // Simple regex to split by string but keep quotes
        args = customArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        // Remove quotes from arguments
        args = args.map(arg => arg.replace(/^"|"$/g, ''));
      }

      setStatus(`Running FFmpeg: ffmpeg ${args.join(' ')}`);
      console.log('Running ffmpeg', args);
      
      await ffmpeg.exec(args);
      
      setStatus('Saving file...');
      const outputData = await ffmpeg.readFile(outputName);
      
      let mimeType = `video/${getOutputExt()}`;
      if (getOutputExt() === 'gif') mimeType = 'image/gif';
      if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(getOutputExt())) {
        mimeType = `audio/${getOutputExt()}`;
      }

      const blob = new Blob([outputData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultName(outputName);
      setStatus('Done!');
      setProgress(100);
      
    } catch (e) {
      console.error(e);
      setStatus('Error occurred! Check logs.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans p-4 md:p-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 mb-2 border-b border-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
                {t('appName')} <span className="text-xs font-normal text-slate-500">v4.2.0 (FFmpeg Native)</span>
              </h1>
              <p className="text-slate-400 text-sm">{t('appDesc')}</p>
            </div>
          </div>
          <div>
            <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
              <SelectTrigger className="w-[120px] bg-black/20 border-white/5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {!loaded ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-[#141417] border border-white/5 shadow-2xl rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className="text-slate-400 font-medium">
              {loadingMsg === 'error' ? t('loadingMsgError') : t('loadingMsgDefault')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Input File Section */}
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle><FileVideo2 className="w-4 h-4 text-indigo-400"/> {t('inputFileTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-42 border border-dashed border-white/10 rounded-xl cursor-pointer bg-black/20 hover:bg-black/40 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-3 text-indigo-400" />
                        <p className="mb-2 text-sm text-slate-300 font-medium">{t('inputFileDesc')}</p>
                        <p className="text-xs text-slate-500">{file ? file.name : t('supportedFormats')}</p>
                      </div>
                      <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                  {file && (
                    <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg flex items-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mr-2 shrink-0"></div>
                      <span className="text-xs text-indigo-200 font-medium break-all w-full leading-relaxed">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {resultUrl && (
                <Card className="border-emerald-500/30">
                  <CardContent className="pt-6">
                    <h3 className="text-emerald-400 text-sm font-semibold mb-4 flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 shrink-0"></div>{t('successTitle')}</h3>
                    <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg transition-all rounded-xl">
                      <a href={resultUrl} download={resultName}>
                        <Download className="w-4 h-4 mr-2" /> {t('downloadBtn')}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Controls Section */}
            <div className="md:col-span-2 space-y-6">
              <Card className="flex flex-col">
                <CardHeader className="pb-4 border-b border-white/5">
                  <div className="flex space-x-2">
                    <Button variant={mode === 'convert' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('convert')}>{t('modeConverter')}</Button>
                    <Button variant={mode === 'gif' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('gif')}>{t('modeGif')}</Button>
                    <Button variant={mode === 'metadata' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('metadata')}>{t('modeMetadata')}</Button>
                    <Button variant={mode === 'custom' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('custom')}><Terminal className="w-4 h-4 mr-1"/> {t('modeCustom')}</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1">
                  
                  {mode === 'convert' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('outputFormat')}</Label>
                          <Select value={outputFormat} onValueChange={setOutputFormat}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mp4">MP4 Video (.mp4)</SelectItem>
                              <SelectItem value="webm">WebM Video (.webm)</SelectItem>
                              <SelectItem value="mov">QuickTime (.mov)</SelectItem>
                              <SelectItem value="mkv">Matroska (.mkv)</SelectItem>
                              <SelectItem value="avi">AVI (.avi)</SelectItem>
                              <SelectItem value="flv">Flash Video (.flv)</SelectItem>
                              <SelectItem value="mp3">MP3 Audio (.mp3)</SelectItem>
                              <SelectItem value="wav">WAV Audio (.wav)</SelectItem>
                              <SelectItem value="ogg">OGG Audio (.ogg)</SelectItem>
                              <SelectItem value="m4a">M4A Audio (.m4a)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('videoCodec')}</Label>
                          <Select value={videoCodec} onValueChange={setVideoCodec}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="copy">Copy (Fast - No re-encode)</SelectItem>
                              <SelectItem value="libx264">H.264 (Broad support)</SelectItem>
                              <SelectItem value="libx265">HEVC / H.265 (High efficiency)</SelectItem>
                              <SelectItem value="libvpx-vp9">VP9 (For WebM)</SelectItem>
                              <SelectItem value="libvpx">VP8</SelectItem>
                              <SelectItem value="mpeg4">MPEG-4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('audioCodec')}</Label>
                          <Select value={audioCodec} onValueChange={setAudioCodec}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="copy">Copy</SelectItem>
                              <SelectItem value="aac">AAC</SelectItem>
                              <SelectItem value="libmp3lame">MP3</SelectItem>
                              <SelectItem value="flac">FLAC (Lossless)</SelectItem>
                              <SelectItem value="libopus">Opus</SelectItem>
                              <SelectItem value="libvorbis">Vorbis</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {videoCodec !== 'copy' && (
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                           <div className="space-y-2">
                            <Label>{t('resolution')}</Label>
                            <Select value={videoResolution} onValueChange={setVideoResolution}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="original">Original</SelectItem>
                                <SelectItem value="1920x1080">1080p (1920x1080)</SelectItem>
                                <SelectItem value="1280x720">720p (1280x720)</SelectItem>
                                <SelectItem value="854x480">480p (854x480)</SelectItem>
                                <SelectItem value="640x360">360p (640x360)</SelectItem>
                                <SelectItem value="custom">{t('customResolution')}</SelectItem>
                              </SelectContent>
                            </Select>
                            {videoResolution === 'custom' && (
                              <div className="flex gap-2 mt-2">
                                <Input value={customResX} onChange={e => setCustomResX(e.target.value)} placeholder="Width" className="flex-1" />
                                <span className="self-center">x</span>
                                <Input value={customResY} onChange={e => setCustomResY(e.target.value)} placeholder="Height" className="flex-1" />
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>{t('crop')}</Label>
                            <Select value={videoCrop} onValueChange={setVideoCrop}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t('none')}</SelectItem>
                                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                <SelectItem value="16:9">16:9</SelectItem>
                                <SelectItem value="4:3">4:3</SelectItem>
                                <SelectItem value="custom">{t('customCrop')}</SelectItem>
                              </SelectContent>
                            </Select>
                            {videoCrop === 'custom' && (
                               <div className="grid grid-cols-2 gap-2 mt-2">
                                <Input value={customCropW} onChange={e => setCustomCropW(e.target.value)} placeholder="W" />
                                <Input value={customCropH} onChange={e => setCustomCropH(e.target.value)} placeholder="H" />
                                <Input value={customCropX} onChange={e => setCustomCropX(e.target.value)} placeholder="X" />
                                <Input value={customCropY} onChange={e => setCustomCropY(e.target.value)} placeholder="Y" />
                               </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <div className="space-y-2">
                          <Label>{t('trimStart')} <span className="opacity-60 lowercase">{t('optional')}</span></Label>
                          <Input value={convertTrimStart} onChange={e => setConvertTrimStart(e.target.value)} placeholder="00:00:00" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('trimEnd')} <span className="opacity-60 lowercase">{t('optional')}</span></Label>
                          <Input value={convertTrimEnd} onChange={e => setConvertTrimEnd(e.target.value)} placeholder="00:01:30" />
                        </div>
                      </div>
                      
                      <div className="border-t border-white/5 pt-4">
                        <button 
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                          {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                          {t('advancedOptions')}
                        </button>
                        
                        {showAdvanced && (
                          <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{t('videoPreset')} <span className="opacity-60 lowercase">({t('ifApplicable')})</span></Label>
                                <Select value={videoPreset} onValueChange={setVideoPreset} disabled={videoCodec === 'copy'}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Default</SelectItem>
                                    <SelectItem value="ultrafast">Ultrafast</SelectItem>
                                    <SelectItem value="superfast">Superfast</SelectItem>
                                    <SelectItem value="veryfast">Veryfast</SelectItem>
                                    <SelectItem value="faster">Faster</SelectItem>
                                    <SelectItem value="fast">Fast</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="slow">Slow</SelectItem>
                                    <SelectItem value="slower">Slower</SelectItem>
                                    <SelectItem value="veryslow">Veryslow</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t('videoBitrate')}</Label>
                                <Input 
                                  value={videoBitrate} 
                                  onChange={e => setVideoBitrate(e.target.value)} 
                                  placeholder="e.g. 1000k, 2M" 
                                  disabled={videoCodec === 'copy'}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t('crfQuality')} <span className="opacity-60 lowercase">(e.g. 18-28)</span></Label>
                                <Input 
                                  value={videoCrf} 
                                  onChange={e => setVideoCrf(e.target.value)} 
                                  placeholder="e.g. 23 (lower is better)" 
                                  disabled={videoCodec === 'copy'}
                                />
                              </div>
                              <div className="space-y-4 col-span-2 mt-2">
                                <div className="flex items-center justify-between border border-white/5 p-3 rounded-lg bg-black/10">
                                  <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">{t('videoStabilization')}</Label>
                                    <p className="text-[10px] text-slate-500">{t('deshakeDesc')}</p>
                                  </div>
                                  <Switch 
                                    checked={videoStabilization !== 'none'} 
                                    onCheckedChange={(c) => setVideoStabilization(c ? 'default' : 'none')} 
                                    disabled={videoCodec === 'copy'} 
                                  />
                                </div>
                                
                                {videoStabilization !== 'none' && (
                                  <div className="space-y-2">
                                    <Label>{t('stabilizationLevel')}</Label>
                                    <Select value={videoStabilization} onValueChange={setVideoStabilization} disabled={videoCodec === 'copy'}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">{t('levelDefault')}</SelectItem>
                                        <SelectItem value="strong">{t('levelStrong')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <Label>{t('additionalFlags')}</Label>
                              <Input 
                                value={additionalFlags} 
                                onChange={e => setAdditionalFlags(e.target.value)} 
                                placeholder="e.g. -crf 18 -pix_fmt yuv420p" 
                                className="font-mono text-xs"
                              />
                              <p className="text-[10px] text-slate-500">{t('additionalFlagsDesc')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === 'gif' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('startTime')}</Label>
                          <Input value={gifStart} onChange={e => setGifStart(e.target.value)} placeholder="00:00:00" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('duration')}</Label>
                          <Input value={gifDuration} onChange={e => setGifDuration(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('fps')}</Label>
                          <Input value={gifFps} onChange={e => setGifFps(e.target.value)} type="number" />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('widthScale')}</Label>
                          <Input value={gifScale} onChange={e => setGifScale(e.target.value)} type="number" />
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4">
                        <button 
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                        >
                          {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                          {t('advancedOptions')}
                        </button>
                        
                        {showAdvanced && (
                          <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>{t('dithering')}</Label>
                                <Select value={gifDither} onValueChange={setGifDither}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sierra2_4a">Sierra2 4A (Default, fast & good)</SelectItem>
                                    <SelectItem value="floyd_steinberg">Floyd Steinberg (Very High quality blur)</SelectItem>
                                    <SelectItem value="sierra2">Sierra 2</SelectItem>
                                    <SelectItem value="bayer">Bayer (Ordered, retro look)</SelectItem>
                                    <SelectItem value="heckbert">Heckbert</SelectItem>
                                    <SelectItem value="none">None (Banding)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t('colorAlgorithm')}</Label>
                                <Select value={gifStatsMode} onValueChange={setGifStatsMode}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="full">Full (Best for general)</SelectItem>
                                    <SelectItem value="diff">Diff (Best for slight movements)</SelectItem>
                                    <SelectItem value="single">Single (Per frame)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>{t('maxColors')} <span className="opacity-60 lowercase">(2-256)</span></Label>
                                <Input value={gifColors} onChange={e => setGifColors(e.target.value)} type="number" max="256" min="2" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === 'metadata' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <p className="text-xs text-slate-400 mb-2">{t('metadataNotice')}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('title')}</Label>
                        <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="My Awesome Video" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('artistAuthor')}</Label>
                        <Input value={metaArtist} onChange={e => setMetaArtist(e.target.value)} placeholder="John Doe" />
                      </div>
                    </div>
                  )}

                  {mode === 'custom' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('customArgs')}</Label>
                        <Textarea 
                          value={customArgs} 
                          onChange={e => setCustomArgs(e.target.value)} 
                          className="font-mono text-sm"
                          rows={3}
                        />
                        <p className="text-[10px] text-slate-500">{t('customArgsDesc')}</p>
                      </div>
                    </div>
                  )}

                </CardContent>
                <CardFooter className="bg-black/20 border-t border-white/5 flex justify-between items-center py-4">
                  <span className="text-xs font-medium text-slate-400">{status}</span>
                  <Button onClick={execute} disabled={!file || progress > 0 && progress < 100} variant="secondary">
                    <Play className="w-4 h-4 mr-2" /> {t('startProcessing')}
                  </Button>
                </CardFooter>
              </Card>

              {/* Progress & Logs */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm flex items-center"><Settings2 className="w-4 h-4 mr-2 text-indigo-400"/> {t('consoleOutput')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={progress} className="mb-4" />
                  <div className="bg-black font-mono text-xs p-4 rounded-xl border border-white/5 h-48 overflow-y-auto">
                    <pre ref={logRef} className="text-[11px] text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                      {logs || t('waitingTask')}
                    </pre>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      <footer className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between text-[11px] font-medium text-slate-500 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${loaded ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span>{t('systemSupported')}</span>
          </div>
          <span className="text-slate-700">|</span>
          <span>FFmpeg Binary Internal: {loaded ? t('ffmpegStatusOk') : t('ffmpegStatusInit')}</span>
        </div>
        <div className="flex gap-4">
          <span className="text-indigo-400 hidden sm:inline">{t('wasmAccelerated')}</span>
        </div>
      </footer>
    </div>
  );
}

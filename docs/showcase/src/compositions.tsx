import React from 'react';
import { AbsoluteFill, Composition, Freeze, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// 文档原创样片：所有运动由帧号驱动，不依赖外部图片、模型或网络。
const ink = '#131513';
const paper = '#f0eee5';
const lime = '#d5fa43';
const mono = '"Courier New", monospace';
const sans = 'Arial, "Microsoft YaHei", sans-serif';
const clip = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const Tag = ({children, style = {}}: {children: React.ReactNode; style?: React.CSSProperties}) =>
  <div style={{fontFamily: mono, fontSize: 15, letterSpacing: 2, ...style}}>{children}</div>;

export const TitleFilm = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = spring({frame: f - 8, fps, config: {damping: 18}});
  const wipe = interpolate(f, [0, 65, 145, 179], [0, 360, 480, 680], clip);
  return <AbsoluteFill style={{background: ink, color: paper, fontFamily: sans, overflow: 'hidden'}}>
    <svg width="1280" height="720" style={{position: 'absolute'}}>
      <defs><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" stroke="#ffffff" strokeOpacity=".06" fill="none"/></pattern></defs>
      <rect width="1280" height="720" fill="url(#grid)"/>
      <circle cx="1100" cy="345" r="270" fill="none" stroke={lime} strokeWidth="1"/>
      <circle cx="1100" cy="345" r="205" fill="none" stroke={lime} strokeOpacity=".3"/>
      <path d={`M${960 + Math.sin(f / 25) * 70} 55V660M790 ${wipe}H1270`} stroke={lime} strokeWidth="2"/>
    </svg>
    <Tag style={{position: 'absolute', top: 45, left: 52, color: lime}}>REMOTION STUDIO / MOTION STUDY 001</Tag>
    <div style={{position: 'absolute', top: 137, left: 52, transform: `translateY(${(1 - rise) * 100}px)`, opacity: rise}}>
      <div style={{fontSize: 108, fontWeight: 900, lineHeight: .96, letterSpacing: -7}}>MAKE<br/>EVERY<br/><span style={{color: lime}}>FRAME.</span></div>
      <div style={{fontSize: 23, marginTop: 27, color: '#a6aaa0', letterSpacing: 3}}>让每一帧，都有表达。</div>
    </div>
    <div style={{position: 'absolute', left: 885, top: 255, width: 230, height: 230, background: lime, borderRadius: 20,
      transform: `rotate(${f * .4 - 28}deg) scale(${.85 + Math.sin(f / 30) * .08})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg width="110" height="110" viewBox="0 0 100 100"><path d="M28 15L85 50L28 85Z" fill={ink}/></svg>
    </div>
    <Tag style={{position: 'absolute', bottom: 38, left: 52, color: '#909589'}}>KINETIC TYPE · 16:9 · 30 FPS</Tag>
    <Tag style={{position: 'absolute', bottom: 38, right: 52}}>{`00:00:${String(Math.floor(f / fps)).padStart(2, '0')}:${String(f % fps).padStart(2, '0')}`}</Tag>
  </AbsoluteFill>;
};

export const ProductFilm = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: f, fps, config: {damping: 22}});
  const float = Math.sin(f / 23) * 16;
  return <AbsoluteFill style={{background: '#f36042', color: ink, fontFamily: sans, overflow: 'hidden'}}>
    <Tag style={{position: 'absolute', left: 50, top: 52}}>OBJECT STUDY / 002</Tag>
    <div style={{position: 'absolute', left: 45, top: 140, fontSize: 106, fontWeight: 900, letterSpacing: -7, lineHeight: .87}}>LESS.<br/>BUT<br/>LOUDER.</div>
    <div style={{position: 'absolute', left: 180, top: 500, width: 370, height: 500, transform: `translateY(${float + (1 - enter) * 220}px) rotate(${Math.sin(f / 40) * 8 - 12}deg)`}}>
      <div style={{position: 'absolute', width: 310, height: 55, background: '#5c2519', filter: 'blur(25px)', opacity: .3, borderRadius: '50%', bottom: 0, left: 30}}/>
      <div style={{position: 'absolute', inset: '0 0 30px', borderRadius: '75px 75px 95px 95px', background: 'linear-gradient(110deg, #32392e, #141b16 56%, #3d4935)', boxShadow: '25px 30px 45px #54291c55', border: '2px solid #ffffff22'}}>
        <div style={{position: 'absolute', top: 48, left: 32, right: 32, height: 6, borderRadius: 5, background: '#94a572'}}/>
        <div style={{position: 'absolute', top: 128, left: 30, right: 30, height: 214, borderRadius: 8, background: lime, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
          <div style={{fontSize: 83, fontWeight: 900, letterSpacing: -7}}>FORM</div>
          <Tag style={{fontSize: 12}}>AN IMAGINARY OBJECT</Tag>
        </div>
        <div style={{position: 'absolute', bottom: 43, left: 32, color: '#bcc6ac', fontFamily: mono, fontSize: 14}}>DESIGNED TO MOVE. ↗</div>
      </div>
    </div>
    <div style={{position: 'absolute', bottom: 125, left: 50, fontSize: 24, letterSpacing: 2}}>更少元素，更强表达。</div>
    <Tag style={{position: 'absolute', bottom: 50, left: 50}}>PRODUCT LOOP · 9:16 · 30 FPS</Tag>
    <Tag style={{position: 'absolute', bottom: 50, right: 50}}>06 SEC</Tag>
  </AbsoluteFill>;
};

export const DataFilm = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = interpolate(f, [12, 95], [0, 1], clip);
  const values = [46, 72, 55, 88, 68, 97, 82];
  return <AbsoluteFill style={{background: paper, color: ink, fontFamily: sans}}>
    <Tag style={{position: 'absolute', left: 52, top: 44}}>DATA IN MOTION / 003</Tag>
    <div style={{position: 'absolute', top: 110, left: 52, fontSize: 74, fontWeight: 900, letterSpacing: -4}}>TURN NUMBERS<br/>INTO STORIES.</div>
    <div style={{position: 'absolute', top: 313, left: 55, fontSize: 22, color: '#656b5c'}}>数据有节奏，叙事有重点。</div>
    <div style={{position: 'absolute', left: 55, bottom: 125, fontSize: 145, letterSpacing: -10, fontWeight: 900, lineHeight: 1}}>{Math.round(progress * 97)}<span style={{fontSize: 65}}>%</span></div>
    <div style={{position: 'absolute', right: 65, bottom: 125, height: 350, display: 'flex', alignItems: 'flex-end', gap: 18}}>
      {values.map((value, i) => {
        const p = spring({frame: f - 8 - i * 7, fps, config: {damping: 20}});
        return <div key={i} style={{width: 60, height: Math.max(2, value * 3.4 * p), background: i === 5 ? '#f36042' : ink, position: 'relative', borderRadius: '5px 5px 0 0'}}>
          <Tag style={{position: 'absolute', left: 0, right: 0, bottom: -32, textAlign: 'center', fontSize: 12, color: '#737869'}}>{`0${i + 1}`}</Tag>
        </div>;
      })}
    </div>
    <div style={{position: 'absolute', left: 52, right: 52, bottom: 68, height: 1, background: '#bfc3b5'}}/>
    <Tag style={{position: 'absolute', bottom: 35, left: 52}}>EDITORIAL CHART · 16:9 · 30 FPS</Tag>
    <Tag style={{position: 'absolute', bottom: 35, right: 52}}>ILLUSTRATIVE DATA / 演示数据</Tag>
  </AbsoluteFill>;
};

const PortraitOnStage = () => <AbsoluteFill style={{background: '#232720', fontFamily: mono}}>
  <div style={{position: 'absolute', left: 66, top: 70, color: paper, fontSize: 50, lineHeight: 1.2}}>SMALL<br/>SCREEN.<br/><span style={{color: lime}}>BIG<br/>ENERGY.</span></div>
  <Tag style={{position: 'absolute', left: 70, bottom: 70, color: '#9ca58d'}}>02 / VERTICAL FILM</Tag>
  <div style={{position: 'absolute', left: 660, top: 0, width: 405, height: 720, overflow: 'hidden'}}>
    <div style={{width: 720, height: 1280, transform: 'scale(.5625)', transformOrigin: 'top left', position: 'relative'}}><ProductFilm/></div>
  </div>
</AbsoluteFill>;

const Showreel = () => <AbsoluteFill>
  <Sequence from={0} durationInFrames={120}><TitleFilm/></Sequence>
  <Sequence from={120} durationInFrames={120}><PortraitOnStage/></Sequence>
  <Sequence from={240} durationInFrames={120}><DataFilm/></Sequence>
</AbsoluteFill>;

const Cover = () => <AbsoluteFill style={{background: ink, color: paper, fontFamily: sans, overflow: 'hidden'}}>
  <div style={{position: 'absolute', top: 0, right: 0, bottom: 0, width: 660, background: '#20251a'}}/>
  <div style={{position: 'absolute', top: 45, left: 55, display: 'flex', alignItems: 'center', gap: 16}}>
    <div style={{width: 32, height: 32, background: lime, color: ink, display: 'grid', placeItems: 'center', fontSize: 18}}>▶</div>
    <Tag style={{fontSize: 17, color: lime}}>REMOTION STUDIO</Tag>
    <Tag style={{fontSize: 13, color: '#8c9583', marginLeft: 16}}>DSH PLUGIN / 001</Tag>
  </div>
  <div style={{position: 'absolute', top: 163, left: 53, fontSize: 100, lineHeight: 1.16, fontWeight: 800, letterSpacing: -5}}>把想法，<br/>放进<span style={{color: lime}}>画面。</span></div>
  <div style={{position: 'absolute', top: 435, left: 58, fontSize: 27, color: '#bac0b2', lineHeight: 1.7}}>用对话组织创作。用 React 编排镜头。<br/>在官方 Remotion Studio 预览与输出。</div>
  <div style={{position: 'absolute', left: 58, top: 590, display: 'flex', gap: 11}}>
    {['动态排版', '产品短片', '数据叙事'].map(text => <div key={text} style={{border: '1px solid #4a5140', padding: '13px 21px', fontSize: 19, color: '#d8ddce'}}>{text}</div>)}
  </div>
  <div style={{position: 'absolute', left: 58, right: 58, bottom: 102, height: 1, background: '#414839'}}/>
  <Tag style={{position: 'absolute', left: 58, bottom: 53, fontSize: 15, color: '#9da58f'}}>IDEA → COMPOSITION → PREVIEW → RENDER</Tag>
  <Tag style={{position: 'absolute', right: 58, bottom: 53, fontSize: 15, color: lime}}>CODE IS THE TIMELINE. ↗</Tag>
  <div style={{position: 'absolute', left: 847, top: 133, width: 675, height: 380, transform: 'rotate(-5deg)', border: '1px solid #5b634e', boxShadow: '0 25px 45px #0007', overflow: 'hidden'}}>
    <div style={{width: 1280, height: 720, transform: 'scale(.52735)', transformOrigin: 'top left', position: 'relative'}}><Freeze frame={90}><TitleFilm/></Freeze></div>
  </div>
  <div style={{position: 'absolute', left: 850, top: 537, width: 480, height: 270, transform: 'rotate(3deg)', boxShadow: '0 15px 35px #0008', overflow: 'hidden'}}>
    <div style={{width: 1280, height: 720, transform: 'scale(.375)', transformOrigin: 'top left', position: 'relative'}}><Freeze frame={100}><DataFilm/></Freeze></div>
  </div>
  <div style={{position: 'absolute', left: 1330, top: 442, width: 206, height: 366, transform: 'rotate(7deg)', border: '5px solid #131513', boxShadow: '0 15px 25px #0007', overflow: 'hidden'}}>
    <div style={{width: 720, height: 1280, transform: 'scale(.2862)', transformOrigin: 'top left', position: 'relative'}}><Freeze frame={100}><ProductFilm/></Freeze></div>
  </div>
</AbsoluteFill>;

export const RemotionRoot = () => <>
  <Composition id="Cover" component={Cover} durationInFrames={180} fps={30} width={1600} height={900}/>
  <Composition id="Showreel" component={Showreel} durationInFrames={360} fps={30} width={1280} height={720}/>
  <Composition id="TitleFilm" component={TitleFilm} durationInFrames={180} fps={30} width={1280} height={720}/>
  <Composition id="ProductFilm" component={ProductFilm} durationInFrames={180} fps={30} width={720} height={1280}/>
  <Composition id="DataFilm" component={DataFilm} durationInFrames={180} fps={30} width={1280} height={720}/>
</>;

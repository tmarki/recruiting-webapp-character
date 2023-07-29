import { useState } from 'react';
import './App.css';
import { ATTRIBUTE_LIST, CLASS_LIST, SKILL_LIST } from './consts.js';
import axios from 'axios';

const MAX_ATTRIBUTE_POINTS = 70;

function incAttr(character, field, val, setState) {
  if(val < 0 || canUpAttr(character)){
    const newval = character['attributes'][field] + val;
    if(newval >= 0) {
      setState(character => ({...character,
        attributes: { ...character['attributes'], [field]: newval }}));
    }
  }
}

function incSkill(character, field, val, setState) {
  if(val < 0 || canUpSkill(character)){
    const newval = character['skills'][field] + val;
    if(newval >= 0) {
      setState(character => ({...character,
        skills: { ...character['skills'], [field]: newval }}));
    }
  }
}

function createDefault() {
  const defaultCharacter = {attributes: {}, skills: {}};
  for(let i = 0; i < ATTRIBUTE_LIST.length; ++i) {
    defaultCharacter.attributes[ATTRIBUTE_LIST[i]] = 0;
  }
  for(let i = 0; i < SKILL_LIST.length; ++i) {
    defaultCharacter.skills[SKILL_LIST[i]['name']] = 0;
  }
  return defaultCharacter;
}

function calculateModifier(char, attrName) {
  return Math.floor((char['attributes'][attrName] - 10) / 2);
}

function calculateSkillPointsAvailable(char) {
  return Math.max(0, 10 + calculateModifier(char, 'Intelligence') * 4);
}

function calculateSkillPointsUsed(char) {
  return Object.keys(char['skills']).reduce((acc, skill) => acc + char['skills'][skill], 0);
}

function canUpSkill(char) {
  return calculateSkillPointsAvailable(char) > calculateSkillPointsUsed(char);
}

function calculateAttrPointsUsed(char) {
  return Object.keys(char['attributes']).reduce((acc, attr) => acc + char['attributes'][attr], 0);
}

function canUpAttr(char) {
  return MAX_ATTRIBUTE_POINTS > calculateAttrPointsUsed(char);
}

function renderCharacterAttributes(char, setState) {
  return ATTRIBUTE_LIST.map(
    attrName => {
      return <div key={attrName}>
      {attrName}: {char['attributes'][attrName]} (Modifier: {calculateModifier(char, attrName)})
      <button onClick={() => incAttr(char, attrName, 1, setState) }>+</button>
      <button onClick={() => incAttr(char, attrName, -1, setState) }>-</button>
    </div>
    }
  );
}

function renderCharacterSkills(char, setState) {
  return SKILL_LIST.map(
    skill => {
      const skillName = skill['name'];
      const mod = calculateModifier(char, skill['attributeModifier']);
      return <div key={skillName}>
      {skillName}: {char['skills'][skillName]}&nbsp;
      <button onClick={() => incSkill(char, skillName, 1, setState) }>+</button>
      <button onClick={() => incSkill(char, skillName, -1, setState) }>-</button>&nbsp;
      Modifier ({skill['attributeModifier']}): {mod}&nbsp;
      Total: {char['skills'][skillName] + mod}
    </div>
    }
  );
}

function checkClassThreshold(character, className) {
  return Object.keys(character['attributes']).reduce((acc, attr) =>
    acc && CLASS_LIST[className][attr] <= character['attributes'][attr], true)
}

function renderClassNames(setClassShown, character) {
  return Object.keys(CLASS_LIST).map(
    cn => {
      return<div key={cn}>
        <h3 onClick={() => setClassShown(cn)} style={{color: checkClassThreshold(character, cn) ? "green" : "red", cursor: "pointer" }} key="cn_{cn}">{cn}</h3>
      </div>;
    }
  );

}

function classRequirements(className) {
  return ATTRIBUTE_LIST.map(attrName => {
    return <div key={attrName}>
      {attrName}: {CLASS_LIST[className][attrName]}
    </div>
  })
}

function renderRequirements(setClassShown, className) {
  if(className) {
    return <div style={{width: "200px", padding: "10px"}}>
        <h1>Requirements</h1>
        <h2>{className}</h2>
        {classRequirements(className)}
        <button onClick={() => setClassShown('')}>hide</button>
    </div>
  }
}

function rollCheck(character, skillSelected, dc, setRollResults) {
  const random = Math.floor(Math.random() * 20) + 1;
  let skillTotal = 0;
  console.log(skillSelected);
  for(let i = 0; i < SKILL_LIST.length; ++i) {
    if(SKILL_LIST[i]['name'] === skillSelected) {
      const mod = calculateModifier(character, SKILL_LIST[i]['attributeModifier']);
      const baseSkill = character.skills[skillSelected];
      console.log(baseSkill, mod);
      skillTotal = mod + baseSkill;
      break;
    }
  }
  const success = (skillTotal + random) >= parseInt(dc);
  const result = {random, dc, success, skillTotal};
  setRollResults(result);
}

function RollResult(props) {
  if(Object.keys(props.result).length) {
    return <div>
      <h3>Roll result</h3>
      Random: {props.result.random}<br />
      Success: {props.result.success ? "True" : "False"}
    </div>;
  }
}

function SkillCheck(props) {
  const [skillSelected, setSelectedSkill] = useState(SKILL_LIST[0]['name']);
  const [dcSelected, setDc] = useState(20);
  const [rollResult, setRollResult] = useState({});
  return <div>
      <select onChange={e => setSelectedSkill(e.target.value)}>
        {SKILL_LIST.map(
          skill => {
            const skillName = skill['name'];
            return <option key={skillName} value={skillName}>{skillName}</option>;
          })}
      </select><br />
      DC: <input type="number" value={dcSelected} onChange={e => setDc(e.target.value)} /><br />
      <button onClick={() => rollCheck(props.character, skillSelected, dcSelected, setRollResult)}>Roll</button>
      <RollResult result={rollResult} />
    </div>;
}

function Character(props) {
  const [showClass, setClassShown] = useState('');
  const [character, setCharacter] = useState(createDefault);
  return (
    <div key={props.number}>
      <h1>Character {props.number + 1}</h1>
      <button onClick={() => saveToBackend(character)}>Save</button>
      <button onClick={() => loadFromBackend(setCharacter)}>Load</button>
      <div>
        <h2>Skill Check</h2>
        <SkillCheck character={character} />
      </div>
      <div style={{display: "flex", textAlign: "left"}}>
          <div style={{width: "300px", padding: "10px"}}>
            <h2>Attributes</h2>
            <h4>Points used/available: {calculateAttrPointsUsed(character)}/{MAX_ATTRIBUTE_POINTS}</h4>
          {renderCharacterAttributes(character, setCharacter)}
          </div> 
          <div style={{width: "200px", padding: "10px"}}>
            <h2>Classes</h2>
            {renderClassNames(setClassShown, character)}
          </div>
          {renderRequirements(setClassShown, showClass)}
          <div style={{width: "500px", padding: "10px"}}>
            <h2>Skills</h2>
            <h4>Points used/available: {calculateSkillPointsUsed(character)}/{calculateSkillPointsAvailable(character)}</h4>
            {renderCharacterSkills(character, setCharacter)}
          </div>
        </div>
      </div>
  );
}

function saveToBackend(character) {
  const payload = { characters: [character] };
  axios.post('https://recruiting.verylongdomaintotestwith.ca/api/{tmarki}/character',
    payload,
    {headers: {'Content-Type': 'application/json'}}).then(() => console.log("Save success"));
}

function loadFromBackend(setCharacter) {
  axios.get('https://recruiting.verylongdomaintotestwith.ca/api/{tmarki}/character',
    {headers: {'Content-Type': 'application/json'}})
    .then(res => { 
      const result = res.data.body.characters[0];
      setCharacter(result);
      console.log("Load success");
    });
}

function Characters() {
  const charCount = 1;
  return <div>
    {[...Array(charCount)].map((x, i) => <Character number={i} key={i} />)}
  </div>
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React Coding Exercise</h1>
      </header>
      <section className="App-section">
        <Characters />
      </section>
    </div>
  );
}

export default App;

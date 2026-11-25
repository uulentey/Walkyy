/* Curated surroundings, based on existing route copy and credited photographs.
   These are landscape descriptions, not unverified geological explanations.
   Add naturalFeatures to a route object to override these defaults. */
(function(root){
 const forest={name:'Богд хан уулын ойт хөндий',type:'Ой · Хөндий',description:'Ой мод, задгай хөндийн төрхийг ажиглах боломжтой. Зураг нь Богд хан уулын орчмыг харуулна.',image:'zurag/gallery/bogd-forest.jpg',source:'https://commons.wikimedia.org/wiki/File:Bogd_Khan_Mountain.jpg',credit:'Chongkian · CC BY-SA 4.0'};
 const features={
  'bogd-khan-yagaan-sandal':[forest],
  'bogd-khan-dugui-tsagaan':[forest,{name:'Дугуй цагааны орчин',type:'Харах цэг · Ойн зах',description:'Өгсүүр алхалтын дараа түр амарч, ойр орчмын байгаль, хотын зүг харах хэсэг.',image:'zurag/gallery/dugui-view.jpg',source:'https://commons.wikimedia.org/wiki/File:Dugui_Tsagaan_of_Bogd_Khan_Mountain.jpg',credit:'Shinetungalag · CC BY-SA 4.0'}],
  'terelj-turtle-rock':[{name:'Мэлхий хад',type:'Хадны тогтоц',description:'Мэлхий мэт дүрсээрээ танигдах хад. Эргэн тойрноос нь хэлбэр, гадаргууг ажиглаж, зураг авах боломжтой. Газрын зурагт ойролцоох цэгийг тэмдэглэв.',image:'zurag/gallery/turtle-close.jpg',coordinates:[47.9076,107.4235],source:'https://commons.wikimedia.org/wiki/File:Gorkhi-Terelj_National_Park_46.JPG',credit:'Brücke-Osteuropa · Public domain'}],
  'bogd-khan-summit':[forest,{name:'Цэцээ гүний оргилын орчин',type:'Оргил · Хад',description:'Жимийн мэдээлэлд тэмдэглэсэн оргил хүрэх алхалт. Өгсүүр хэсэг, ой болон хадтай орчныг дайрна.',image:'zurag/tsetseeGun.jpg'}],
  'tenger-rock':[{name:'Ой ба хадтай хэсэг',type:'Хад · Ой',description:'Жимийн тайлбарт дурдсан ой мод, хадтай орчин. Байгалийн тогтцыг замаасаа ажиглаарай.',image:'zurag/tengerHad.jpg'}]
 };
 function forRoute(route){
  const list=Array.isArray(route?.naturalFeatures)?route.naturalFeatures:(features[route?.id]||[]);
  return list.filter(f=>f && typeof f.name==='string' && typeof f.description==='string').slice(0,12);
 }
 const api={forRoute}; if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.WalkyFeatures=api;
})(typeof window!=='undefined'?window:globalThis);
